resource "aws_instance" "k6" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  vpc_security_group_ids = [var.security_group_id]
  subnet_id              = var.subnet_id

  key_name = var.key_name

  tags = {
    terraform   = "true"
    environment = "qa"
    app         = var.sut_name
    creator     = "supabench"
  }
}

resource "null_resource" "remote" {
  connection {
    type        = "ssh"
    user        = var.instance_user
    host        = aws_instance.k6.public_ip
    private_key = var.private_key_location
    timeout     = "1m"
  }

  provisioner "file" {
    source      = "${path.root}/k6"
    destination = "/tmp"
  }

  provisioner "file" {
    destination = "/tmp/k6/entrypoint.sh"
    
    content = templatefile(
      "${path.module}/entrypoint.sh.tpl",
      {
        testrun_id      = var.testrun_id
        benchmark_id    = var.benchmark_id
        testrun_name    = var.testrun_name
        test_origin     = var.test_origin
        supabench_token = var.supabench_token
        supabench_uri   = var.supabench_uri
        pg_pass         = var.pg_pass
        pg_host         = var.pg_host
        mp_token        = var.mp_token
        mp_uri          = var.mp_uri
        rate            = var.rate
        conns           = var.conns
        duration        = var.duration
        rooms           = var.rooms
        testrun_name    = var.testrun_name
      }
    )
  }

  provisioner "remote-exec" {
    inline = [
      "#!/bin/bash",
      "echo \"export RUN_ID='${var.testrun_id}'\" >> ~/.bashrc",
      "echo \"export BENCHMARK_ID='${var.benchmark_id}'\" >> ~/.bashrc",
      "echo \"export TEST_RUN='${var.testrun_name}'\" >> ~/.bashrc",
      "echo \"export TEST_ORIGIN='${var.test_origin}'\" >> ~/.bashrc",
      "echo \"export SUPABENCH_TOKEN='${var.supabench_token}'\" >> ~/.bashrc",
      "echo \"export SUPABENCH_URI='${var.supabench_uri}'\" >> ~/.bashrc",
      "echo \"export PG_PASS='${var.pg_pass}'\" >> ~/.bashrc",
      "echo \"export PG_HOST='${var.pg_host}'\" >> ~/.bashrc",
      "echo \"export MP_TOKEN='${var.mp_token}'\" >> ~/.bashrc",
      "echo \"export MP_URI='${var.mp_uri}'\" >> ~/.bashrc",
    ]
  }

  provisioner "remote-exec" {
    inline = [
      "#!/bin/bash",
      "source ~/.bashrc",
      "sudo chown -R ubuntu:ubuntu /tmp/k6",
      "sudo chmod +x /tmp/k6/entrypoint.sh",
      "/tmp/k6/entrypoint.sh",
    ]
  }

  depends_on = [
    aws_instance.k6,
  ]
}