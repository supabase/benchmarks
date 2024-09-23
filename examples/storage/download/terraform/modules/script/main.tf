# creating ec2 instance that will be used to generate load
# Most likely you will not need to change it

resource "aws_vpc" "ap-southeast-1" {
  enable_dns_support               = true
  enable_dns_hostnames             = true
  assign_generated_ipv6_cidr_block = true
  cidr_block                       = "10.0.0.0/16"
}

resource "aws_subnet" "ap-southeast-1" {
  vpc_id                  = aws_vpc.ap-southeast-1.id
  cidr_block              = cidrsubnet(aws_vpc.ap-southeast-1.cidr_block, 4, 1)
  map_public_ip_on_launch = true

  ipv6_cidr_block                 = cidrsubnet(aws_vpc.ap-southeast-1.ipv6_cidr_block, 8, 1)
  assign_ipv6_address_on_creation = true
}

resource "aws_internet_gateway" "ap-southeast-1" {
  vpc_id = aws_vpc.ap-southeast-1.id
}

resource "aws_default_route_table" "ap-southeast-1" {
  default_route_table_id = aws_vpc.ap-southeast-1.default_route_table_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.ap-southeast-1.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.ap-southeast-1.id
  }
}

resource "aws_route_table_association" "ap-southeast-1" {
  subnet_id      = aws_subnet.ap-southeast-1.id
  route_table_id = aws_default_route_table.ap-southeast-1.id
}

resource "aws_security_group" "ap-southeast-1" {
  name   = "supabench-tf-security-group-${aws_vpc.ap-southeast-1.id}"
  vpc_id = aws_vpc.ap-southeast-1.id
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_instance" "k6" {
  count = var.instances_count

  ami                    = var.ami_id
  instance_type          = var.instance_type
  vpc_security_group_ids = ["${aws_security_group.ap-southeast-1.id}"]
  subnet_id              = aws_subnet.ap-southeast-1.id
  ipv6_address_count     = 1

  key_name = var.key_name

  tags = {
    terraform   = "true"
    environment = "qa"
    app         = var.sut_name
    creator     = "supabench"
  }
}

# uploading k6 scripts and running k6 load test
resource "null_resource" "remote" {
  count = var.instances_count

  # ssh into instance, you likely won't need to change this part
  connection {
    type        = "ssh"
    user        = var.instance_user
    host        = aws_instance.k6[count.index].public_ip
    private_key = var.private_key_location
    timeout     = "5m"
  }

  # upload k6 scripts to remote instance, you likely won't need to change this part
  provisioner "file" {
    source      = "${path.root}/k6"
    destination = "/tmp"
  }

  # upload entrypoint script to remote instance
  # specify your custom variables here
  provisioner "file" {
    destination = "/tmp/k6/entrypoint.sh"

    content = templatefile(
      "${path.module}/entrypoint.sh.tpl",
      {
        # add your custom variables here
        anon_token          = var.anon_token
        service_token       = var.service_token
        base_uri            = var.base_uri
        conns               = var.conns
        requests            = var.requests
        rampscount          = var.rampscount
        rampingduration     = var.rampingduration
        consecutiveduration = var.consecutiveduration

        # don't change these
        testrun_id      = var.testrun_id
        benchmark_id    = var.benchmark_id
        testrun_name    = var.testrun_name
        test_origin     = var.test_origin
        supabench_token = var.supabench_token
        supabench_uri   = var.supabench_uri
      }
    )
  }

  # set env vars
  provisioner "remote-exec" {
    inline = [
      "#!/bin/bash",
      # add your env vars here:
      "echo \"export ANON_TOKEN='${var.anon_token}'\" >> ~/.bashrc",
      "echo \"export SERVICE_TOKEN='${var.service_token}'\" >> ~/.bashrc",
      "echo \"export BASE_URI='${var.base_uri}'\" >> ~/.bashrc",
      # don't change these:
      "echo \"export RUN_ID='${var.testrun_id}'\" >> ~/.bashrc",
      "echo \"export BENCHMARK_ID='${var.benchmark_id}'\" >> ~/.bashrc",
      "echo \"export TEST_RUN='${var.testrun_name}'\" >> ~/.bashrc",
      "echo \"export TEST_ORIGIN='${var.test_origin}'\" >> ~/.bashrc",
      "echo \"export SUPABENCH_TOKEN='${var.supabench_token}'\" >> ~/.bashrc",
      "echo \"export SUPABENCH_URI='${var.supabench_uri}'\" >> ~/.bashrc",
    ]
  }

  # run k6 load test, you likely won't need to change this part
  provisioner "remote-exec" {
    inline = [
      "#!/bin/bash",
      "source ~/.bashrc",
      "sudo chown -R ubuntu:ubuntu /tmp/k6",
      "sudo chmod +x /tmp/k6/entrypoint.sh",
      "/tmp/k6/entrypoint.sh",
    ]
  }

  # we should provide instance first so that we can ssh into it
  depends_on = [
    aws_instance.k6,
  ]
}
