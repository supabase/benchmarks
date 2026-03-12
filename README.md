# supabench

Platform to run and keep the history of benchmark runs.

![Supabench Banner](https://user-images.githubusercontent.com/58992960/186262109-e6c9ab69-e5f7-4fd0-bd62-5ea08ab3fe60.png)

## References

- [Supabase](https://supabase.com) - Built by Supabase team.
- [Pocketbase](https://pocketbase.io) - This project uses Pocketbase as a backend, and the frontend is also based on the Pocketbase admin UI.
- [k6](https://k6.io) - The load generator used.
- [Terraform](https://www.terraform.io) - SUT and loader infrastructure delivery.
- [Grafana](https://grafana.com) - Dashboard for benchmark results.
- [Prometheus](https://prometheus.io) - Store metrics for benchmark results.
- [Telegraf](https://www.influxdata.com/time-series-platform/telegraf/) - Send benchmark metrics to Prometheus.

## Uploading Benchmarks to Supabench

To upload a benchmark to supabench, you need to create a zip archive of your benchmark folder.

### How to Create a Zip Archive

1. **Navigate to your benchmark folder** (e.g., `examples/realtime/broadcast-from-client`)

2. **Create a zip file** containing all the files in the folder:
   ```bash
   # From inside the benchmark folder
   zip -r benchmark.zip .
   ```

3. **Upload the zip file** through the supabench UI when creating or updating a benchmark secret.

### Example Structure

Your zip file should contain a structure like this:
```
benchmark.zip
├── main.tf
├── variables.tf
├── k6/
│   ├── common.js
│   ├── subs.js
│   ├── Makefile
│   └── summary.js
└── modules/
    └── script/
        ├── main.tf
        ├── variables.tf
        └── entrypoint.sh.tpl
```

## More Info

More information about the project can be found on the [Github Wiki](https://github.com/supabase/supabench/wiki)
