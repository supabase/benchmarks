<script>
    import { createEventDispatcher, tick } from "svelte";
    import { Record } from "pocketbase";
    import tooltip from "@/actions/tooltip";
    import CommonHelper from "@/utils/CommonHelper";
    import ApiClient from "@/utils/ApiClient";
    import { setErrors } from "@/stores/errors";
    import { confirm } from "@/stores/confirmation";
    import { addSuccessToast } from "@/stores/toasts";
    import Field from "@/components/base/Field.svelte";
    import OverlayPanel from "@/components/base/OverlayPanel.svelte";
    import TextField from "@/components/records/fields/TextField.svelte";
    import JSONField from "@/components/records/fields/JSONField.svelte";

    const dispatch = createEventDispatcher();
    const formId = "record_" + CommonHelper.randomString(5);

    export let project;

    let recordPanel;
    let original = null;
    let record = new Record();
    let isSaving = false;
    let confirmClose = false; // prevent close recursion
    let uploadedFilesMap = {}; // eg.: {"field1":[File1, File2], ...}
    let deletedFileIndexesMap = {}; // eg.: {"field1":[0, 1], ...}
    let initialFormHash = "";
    
    $: grafanaUrl = `${project.grafana_url}&from=${record.started_at}&to=${record.ended_at}&var-testrun=${record.name}`;
    $: meta = JSON.stringify(record.meta, null, 2);

    $: hasFileChanges =
        CommonHelper.hasNonEmptyProps(uploadedFilesMap) ||
        CommonHelper.hasNonEmptyProps(deletedFileIndexesMap);

    $: hasChanges = hasFileChanges || initialFormHash != calculateFormHash(record);

    $: canSave = record.isNew || hasChanges;

    export function show(model) {
        load(model);

        confirmClose = true;

        return recordPanel?.show();
    }

    export function hide() {
        return recordPanel?.hide();
    }

    async function load(model) {
        setErrors({}); // reset errors
        original = model || {};
        record = model?.clone ? model.clone() : new Record();
        uploadedFilesMap = {};
        deletedFileIndexesMap = {};
        await tick(); // wait to populate the fields to get the normalized values
        initialFormHash = calculateFormHash(record);
    }

    function calculateFormHash(m) {
        return JSON.stringify(m);
    }

    function save() {
        if (isSaving || !canSave) {
            return;
        }

        isSaving = true;

        const data = {
            benchmark_id: project.id,
            name: record.run_name.trimEnd().replaceAll(" ", "_"),
            origin: record.run_origin.trimEnd().replaceAll(" ", "_"),
            comment: record.run_comment,
            meta: record.run_meta,
        }

        let request;
        if (record.isNew) {
            request = ApiClient.send("/api/runs", {
              method: "POST",
              body: JSON.stringify(data),
            });
        } else {
            ApiClient.errorResponseHandler({message: "Update is not supported"});
        }

        request
            .then(async (result) => {
                addSuccessToast(
                    record.isNew ? "Successfully created run." : "Successfully updated record."
                );
                confirmClose = false;
                hide();
                dispatch("save", result);
            })
            .catch((err) => {
                ApiClient.errorResponseHandler(err);
            })
            .finally(() => {
                isSaving = false;
            });
    }
</script>

<OverlayPanel
    bind:this={recordPanel}
    class="overlay-panel-lg record-panel"
    beforeHide={() => {
        if (hasChanges && confirmClose) {
            confirm("You have unsaved changes. Do you really want to close the panel?", () => {
                confirmClose = false;
                hide();
            });
            return false;
        }
        return true;
    }}
    on:hide
    on:show
>
    <svelte:fragment slot="header">
        <h4>
            <div style="display: inline-flex; align-items: center; column-gap: 0.75rem;">
            {#if record.isNew}
                <i class="ri-play-list-2-fill" />
                <span>New {project.name} run</span>
            {:else}
                <i class="ri-file-chart-line" />
                <span>{project.name} / {record.name}</span>
            {/if}
            </div>
        </h4>
        <hr class="m-t-5 m-b-xs" />
    </svelte:fragment>

    <form id={formId} class="block" on:submit|preventDefault={save}>
        {#if !record.isNew}
            <Field class="form-field" name="output" let="form-field-output">
                <label for="form-field-output">
                    <i class={CommonHelper.getFieldTypeIcon("text")} />
                    <span class="txt">Output</span>
                </label>
                <textarea bind:value={record.output} readonly style="color:black;" />
            </Field>

            <a
                href={grafanaUrl}
                target="_blank"
                rel="noopener"
                use:tooltip={"Open in new tab"}
                on:click|stopPropagation
            >
                <Field class="form-field" name="grafana_url" style="cursor: pointer;" let:grafana_url>
                    <label for={grafana_url}>
                        <i class="ri-bar-chart-grouped-fill" />
                        <span class="txt" style="text-decoration: none; ">Grafana link</span>
                    </label>
                    <textarea bind:value={grafanaUrl} readonly style="color:black; resize: none; padding-top: 4px !important; padding-bottom: 5px !important; min-height: 36px; height: auto; cursor: pointer;" />
                </Field>
            </a>

            <Field class="form-field" name="comment" let="form-field-comment">
              <label for="form-field-comment">
                  <i class={CommonHelper.getFieldTypeIcon("text")} />
                  <span class="txt">Comment</span>
              </label>
              <textarea bind:value={record.comment} readonly style="color:black; padding-top: 4px !important; padding-bottom: 5px !important; min-height: 96px; height: auto;" />
            </Field>

            <Field class="form-field" name="meta" let="form-field-meta">
              <label for="form-field-meta">
                  <i class={CommonHelper.getFieldTypeIcon("text")} />
                  <span class="txt">Meta</span>
              </label>
              <textarea bind:value={meta} readonly style="color:black; padding-top: 4px !important; padding-bottom: 5px !important; min-height: 96px; height: auto;" />
            </Field>
        {:else}
            <TextField field={{ required: true, name: "name", type: "primary" }} bind:value={record["run_name"]} />
            <TextField field={{ required: false, name: "origin", type: "text" }} bind:value={record["run_origin"]} />

            <TextField field={{ required: false, name: "comment", type: "text" }} bind:value={record["run_comment"]} />
            <JSONField field={{ required: false, name: "meta", type: "json" }} bind:value={record["run_meta"]} />

            <Field class="form-field required" name="bencmark_id" let:bencmark_id>
                <label for={bencmark_id}>
                    <i class={CommonHelper.getFieldTypeIcon("relation")} />
                    <span class="txt">bencmark_id</span>
                </label>
                <textarea bind:value={project.id} readonly style="resize: none; padding-top: 4px !important; padding-bottom: 5px !important; min-height: 36px; height: 36px;" />
            </Field>
        {/if}
    </form>

    <svelte:fragment slot="footer">
      {#if !record.isNew}
        <button type="button" class="btn btn-secondary" disabled={isSaving} on:click={() => hide()}>
            <span class="txt">Close</span>
        </button>
      {:else}
          <button type="button" class="btn btn-secondary" disabled={isSaving} on:click={() => hide()}>
            <span class="txt">Cancel</span>
          </button>
          <button
              type="submit"
              form={formId}
              class="btn btn-expanded"
              class:btn-loading={isSaving}
              disabled={!canSave || isSaving}
          >
              <span class="txt">{record.isNew ? "Create" : "Save changes"}</span>
          </button>
      {/if}
    </svelte:fragment>
</OverlayPanel>

<style>
  textarea {
      resize: none;
      padding-top: 4px !important;
      padding-bottom: 5px !important;
      min-height: 200px;
      height: 400px;
      font-family: monospace;
  }
  </style>
