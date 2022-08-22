import { writable } from "svelte/store";
import ApiClient from "@/utils/ApiClient";
import CommonHelper from "@/utils/CommonHelper";

export const benchmarks = writable([]);
export const activeBenchmark = writable({});
export const isBenchmarksLoading = writable(false);

// add or update benchmark
export function addBenchmark(benchmark) {
    activeBenchmark.update((current) => {
        return CommonHelper.isEmpty(current?.id) || current.id === benchmark.id ? benchmark : current;
    });

    benchmarks.update((list) => {
        CommonHelper.pushOrReplaceByKey(list, benchmark, "id");
        return list;
    });
}

export function removeBenchmark(benchmark) {
    benchmarks.update((list) => {
        CommonHelper.removeByKey(list, "id", benchmark.id);

        activeBenchmark.update((current) => {
            if (current.id === benchmark.id) {
                // fallback to the first non-profile benchmark item
                return list.find((c) => c.name != import.meta.env.PB_PROFILE_COLLECTION) || {};
            }
            return current;
        });

        return list;
    });
}

// load all benchmarks (excluding the user profile)
export async function loadBenchmarks(activeId = null) {
    isBenchmarksLoading.set(true);

    activeBenchmark.set({});
    benchmarks.set([]);

    return ApiClient.Records.getFullList("benchmarks", 200, { sort: "-created", expand: "project_id" })
        .then((items) => {
            benchmarks.set(items);

            const item = activeId && CommonHelper.findByKey(items, "id", activeId);
            if (item) {
                activeBenchmark.set(item);
            } else if (items.length) {
                // fallback to the first non-profile benchmark item
                const nonProfile = items.find((c) => c.name != import.meta.env.PB_PROFILE_COLLECTION);
                if (nonProfile) {
                    activeBenchmark.set(nonProfile);
                }
            }
        })
        .catch((err) => {
            ApiClient.errorResponseHandler(err);
        })
        .finally(() => {
            isBenchmarksLoading.set(false);
        });
}
