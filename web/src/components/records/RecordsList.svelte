<script>
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import tooltip from "@/actions/tooltip";
    import ApiClient from "@/utils/ApiClient";
    import CommonHelper from "@/utils/CommonHelper";
    import { confirm } from "@/stores/confirmation";
    import { addSuccessToast } from "@/stores/toasts";
    import SortHeader from "@/components/base/SortHeader.svelte";
    import FormattedDate from "@/components/base/FormattedDate.svelte";
    import IdLabel from "@/components/base/IdLabel.svelte";
    import RecordFieldCell from "@/components/records/RecordFieldCell.svelte";

    const dispatch = createEventDispatcher();

    export let project;
    export let sort = "";
    export let filter = "";

    let records = [];
    let currentPage = 1;
    let totalRecords = 0;
    let bulkSelected = {};
    let isLoading = true;
    let isDeleting = false;

    $: if (project && project.id && sort !== -1 && filter !== -1) {
        clearList();
        load(1);
    }

    $: canLoadMore = totalRecords > records.length;

    $: fields = project?.schema || [];

    $: totalBulkSelected = Object.keys(bulkSelected).length;

    $: areAllRecordsSelected = records.length && totalBulkSelected === records.length;

    export async function load(page = 1) {
        if (!project?.id) {
            return;
        }

        isLoading = true;

        if (page <= 1) {
            clearList();
        }

        return ApiClient.records.getList("runs", page, 50, {
            sort: sort,
            filter: (filter ? filter + "&&" : "") + `benchmark_id="${project.id}"`,
        })
            .then((result) => {
                isLoading = false;
                records = records.concat(result.items);
                currentPage = result.page;
                totalRecords = result.totalItems;

                dispatch("load", records);
            })
            .catch((err) => {
                if (!err?.isAbort) {
                    isLoading = false;
                    console.warn(err);
                    clearList();
                    ApiClient.errorResponseHandler(err, false);
                }
            });
    }

    function clearList() {
        records = [];
        currentPage = 1;
        totalRecords = 0;
        bulkSelected = {};
    }

    function toggleSelectAllRecords() {
        if (areAllRecordsSelected) {
            deselectAllRecords();
        } else {
            selectAllRecords();
        }
    }

    function deselectAllRecords() {
        bulkSelected = {};
    }

    function selectAllRecords() {
        for (const record of records) {
            bulkSelected[record.id] = record;
        }
        bulkSelected = bulkSelected;
    }

    function toggleSelectRecord(record) {
        if (!bulkSelected[record.id]) {
            bulkSelected[record.id] = record;
        } else {
            delete bulkSelected[record.id];
        }

        bulkSelected = bulkSelected; // trigger reactivity
    }

    function deleteSelectedConfirm() {
        const msg = `Do you really want to delete the selected ${
            totalBulkSelected === 1 ? "record" : "records"
        }?`;

        confirm(msg, deleteSelected);
    }

    async function deleteSelected() {
        if (isDeleting || !totalBulkSelected) {
            return;
        }

        let promises = [];
        for (const recordId of Object.keys(bulkSelected)) {
            promises.push(ApiClient.records.delete("runs", recordId));
        }

        isDeleting = true;

        return Promise.all(promises)
            .then(() => {
                addSuccessToast(
                    `Successfully deleted the selected ${totalBulkSelected === 1 ? "record" : "records"}.`
                );
                deselectAllRecords();
            })
            .catch((err) => {
                ApiClient.errorResponseHandler(err);
            })
            .finally(() => {
                isDeleting = false;

                // always reload because some of the records may not be deletable
                return load();
            });
    }
</script>

<div class="table-wrapper">
    <table class="table" class:table-loading={isLoading}>
        <thead>
            <tr>
                <SortHeader class="col-type-text col-field-id" name="id" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("primary")} />
                        <span class="txt">id</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-text col-field-name" name="name" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("text")} />
                        <span class="txt">name</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-text col-field-origin" name="origin" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("text")} />
                        <span class="txt">origin</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-text col-field-grafana_url" name="grafana_url" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("url")} />
                        <span class="txt">grafana_url</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-date col-field-triggered" name="triggered" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("date")} />
                        <span class="txt">triggered</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-text col-field-status" name="status" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("select")} />
                        <span class="txt">status</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-text col-field-comment" name="comment" bind:sort>
                  <div class="col-header-content">
                      <i class={CommonHelper.getFieldTypeIcon("text")} />
                      <span class="txt">comment</span>
                  </div>
                </SortHeader>
                <SortHeader class="col-type-date col-field-created" name="created" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("date")} />
                        <span class="txt">created</span>
                    </div>
                </SortHeader>
                <SortHeader class="col-type-date col-field-updated" name="updated" bind:sort>
                    <div class="col-header-content">
                        <i class={CommonHelper.getFieldTypeIcon("date")} />
                        <span class="txt">updated</span>
                    </div>
                </SortHeader>
                <th class="col-type-action min-width" />
            </tr>
        </thead>
        <tbody>
            {#each records as record (record.id)}
                <tr
                    tabindex="0"
                    class="row-handle"
                    on:click={() => dispatch("select", record)}
                    on:keydown={(e) => {
                        if (e.code === "Enter") {
                            e.preventDefault();
                            dispatch("select", record);
                        }
                    }}
                >

                    <td class="col-type-text col-field-id">
                        <IdLabel id={record.id} />
                    </td>

                    <td class="col-type-text col-field-name">
                        <span class="txt txt-ellipsis txt-mono" title={record.name}>
                            {record.name}
                        </span>
                    </td>

                    <td class="col-type-text col-field-origin">
                        {#if record.origin}
                            <span class="label" title={record.origin}>
                                {record.origin}
                            </span>
                        {:else}
                            <span class="label" title={record.origin}>
                              n/a
                            </span>
                        {/if}
                    </td>

                    <td class="col-type-text col-field-grafana_url">
                      <a
                          class="txt-ellipsis"
                          href={project.grafana_url + `&from=${record.started_at}&to=${record.ended_at}&var-testrun=${record.name}`}
                          target="_blank"
                          rel="noopener"
                          use:tooltip={"Open in new tab"}
                          on:click|stopPropagation
                      >
                          {project.grafana_url + `&from=${record.started_at}&to=${record.ended_at}&var-testrun=${record.name}`}
                      </a>
                    </td>

                    <td class="col-type-date col-field-triggered">
                        <FormattedDate date={record.triggered_at} />
                    </td>
                    
                    <td class="col-type-date col-field-status">
                      <span class="label">{record.status}</span>
                    </td>

                    <td class="col-type-text col-field-comment">
                      <span class="txt txt-ellipsis" title={record.comment}>
                          {record.comment}
                      </span>
                    </td>
                    
                    <td class="col-type-date col-field-created">
                        <FormattedDate date={record.created} />
                    </td>

                    <td class="col-type-date col-field-updated">
                        <FormattedDate date={record.updated} />
                    </td>

                    <td class="col-type-action min-width">
                        <i class="ri-arrow-right-line" />
                    </td>
                </tr>
            {:else}
                {#if isLoading}
                    <tr>
                        <td colspan="99" class="p-xs">
                            <span class="skeleton-loader" />
                        </td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="99" class="txt-center txt-hint p-xs">
                            <h6>No records found.</h6>
                            {#if filter?.length}
                                <button
                                    type="button"
                                    class="btn btn-hint btn-expanded m-t-sm"
                                    on:click={() => (filter = "")}
                                >
                                    <span class="txt">Clear filters</span>
                                </button>
                            {/if}
                        </td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
</div>

{#if records.length}
    <small class="block txt-hint txt-right m-t-sm">Showing {records.length} of {totalRecords}</small>
{/if}

{#if records.length && canLoadMore}
    <div class="block txt-center m-t-xs">
        <button
            type="button"
            class="btn btn-lg btn-secondary btn-expanded"
            class:btn-loading={isLoading}
            class:btn-disabled={isLoading}
            on:click={() => load(currentPage + 1)}
        >
            <span class="txt">Load more ({totalRecords - records.length})</span>
        </button>
    </div>
{/if}

{#if totalBulkSelected}
    <div class="bulkbar" transition:fly|local={{ duration: 150, y: 5 }}>
        <div class="txt">
            Selected <strong>{totalBulkSelected}</strong>
            {totalBulkSelected === 1 ? "record" : "records"}
        </div>
        <button
            type="button"
            class="btn btn-xs btn-secondary btn-outline p-l-5 p-r-5"
            class:btn-disabled={isDeleting}
            on:click={() => deselectAllRecords()}
        >
            <span class="txt">Reset</span>
        </button>
        <div class="flex-fill" />
        <button
            type="button"
            class="btn btn-sm btn-secondary btn-danger"
            class:btn-loading={isDeleting}
            class:btn-disabled={isDeleting}
            on:click={() => deleteSelectedConfirm()}
        >
            <span class="txt">Delete selected</span>
        </button>
    </div>
{/if}
