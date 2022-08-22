<script>
    import { onMount } from "svelte";
    import { scale } from "svelte/transition";
    import { JSONPath } from 'jsonpath-plus';
    import ApiClient from "@/utils/ApiClient";
    import CommonHelper from "@/utils/CommonHelper";
    import {
        Chart,
        LineElement,
        PointElement,
        LineController,
        LinearScale,
        TimeScale,
        Filler,
        Tooltip,
    } from "chart.js";
    import "chartjs-adapter-luxon";
    import { activeBenchmark } from "@/stores/benchmarks";

    export let filter = "";
    export let projectId;

    let chartCanvas;
    let chartInst;
    let chartData = [];
    let totalRuns = 0;
    let isLoading = false;

    $: if (typeof projectId !== "undefined" && typeof filter !== "undefined") {
        load();
    }

    $: if (typeof chartData !== "undefined" && chartInst) {
        chartInst.data.datasets[0].data = chartData;
        chartInst.update();
    }

    export async function load() {
        isLoading = true;

        return ApiClient.records.getList("runs", 1, 50, {
            filter: (filter ? filter + "&&" : "") + `benchmark_id="${projectId}"`,
            '$cancelKey': "plot",
        })
            .then((result) => {
                resetData();
                for (let item of result.items) {
                    chartData.push({
                        x: CommonHelper.getDateTime(item.triggered_at).toLocal().toJSDate(),
                        y: JSONPath({path: $activeBenchmark.extract_metric_path, json: item.raw})[0],
                    });
                    totalRuns++;;
                }

                // add current time marker to the chart
                // chartData.push({
                //     x: new Date(),
                //     y: undefined,
                // });
            })
            .catch((err) => {
                if (!err?.isAbort) {
                    isLoading = false;
                    console.warn(err);
                    clearList();
                    ApiClient.errorResponseHandler(err, false);
                }
            })
            .finally(() => {
                isLoading = false;
            });
    }

    function resetData() {
        totalRuns = 0;
        chartData = [];
    }

    onMount(() => {
        Chart.register(LineElement, PointElement, LineController, LinearScale, TimeScale, Filler, Tooltip);

        chartInst = new Chart(chartCanvas, {
            type: "line",
            data: {
                datasets: [
                    {
                        label: $activeBenchmark.extract_metric_path,
                        data: chartData,
                        borderColor: "#ef4565",
                        pointBackgroundColor: "#ef4565",
                        backgroundColor: "rgb(239,69,101,0.05)",
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBorderWidth: 0,
                        fill: true,
                    },
                ],
            },
            options: {
                animation: false,
                interaction: {
                    intersect: false,
                    mode: "index",
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "#edf0f3",
                            borderColor: "#dee3e8",
                        },
                        ticks: {
                            precision: 0,
                            maxTicksLimit: 6,
                            autoSkip: true,
                            color: "#666f75",
                        },
                    },
                    x: {
                        type: "time",
                        time: {
                            unit: "hour",
                            tooltipFormat: "DD h a",
                        },
                        grid: {
                            borderColor: "#dee3e8",
                            color: (c) => (c.tick.major ? "#edf0f3" : ""),
                        },
                        ticks: {
                            maxTicksLimit: 15,
                            autoSkip: true,
                            maxRotation: 0,
                            major: {
                                enabled: true,
                            },
                            color: (c) => (c.tick.major ? "#16161a" : "#666f75"),
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        });

        return () => chartInst?.destroy();
    });
</script>

<div class="chart-wrapper" class:loading={isLoading}>
    {#if isLoading}
        <div class="chart-loader loader" transition:scale={{ duration: 150 }} />
    {/if}
    <canvas bind:this={chartCanvas} class="chart-canvas" style="height: 250px; width: 100%;" />
</div>

<div class="txt-hint m-t-xs txt-right">
    {#if isLoading}
        Loading...
    {:else}
        {totalRuns}
        {totalRuns === 1 ? "run" : "runs"}
    {/if}
</div>

<style>
    .chart-wrapper {
        position: relative;
        display: block;
        width: 100%;
    }
    .chart-wrapper.loading .chart-canvas {
        pointer-events: none;
        opacity: 0.5;
    }
    .chart-loader {
        position: absolute;
        z-index: 999;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
</style>
