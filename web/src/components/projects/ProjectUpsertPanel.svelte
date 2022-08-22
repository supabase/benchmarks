<script>
    import { Collection } from "pocketbase";
    import { createEventDispatcher, tick } from "svelte";
    import { scale } from "svelte/transition";
    import CommonHelper from "@/utils/CommonHelper";
    import ApiClient from "@/utils/ApiClient";
    import { errors, setErrors } from "@/stores/errors";
    import { confirm } from "@/stores/confirmation";
    import { addSuccessToast } from "@/stores/toasts";
    import { addBenchmark, removeBenchmark, activeBenchmark } from "@/stores/benchmarks";
    import tooltip from "@/actions/tooltip";
    import Field from "@/components/base/Field.svelte";
    import Toggler from "@/components/base/Toggler.svelte";
    import OverlayPanel from "@/components/base/OverlayPanel.svelte";
    import ProjectFieldsTab from "@/components/projects/ProjectFieldsTab.svelte";
    import ProjectRulesTab from "@/components/projects/ProjectRulesTab.svelte";
    import ProjectUpdateConfirm from "@/components/projects/ProjectUpdateConfirm.svelte";

    const TAB_FIELDS = "fields";
    const TAB_RULES = "api_rules";
    const dispatch = createEventDispatcher();

    let projectPanel;
    let confirmChangesPanel;

    let original = null;
    let project = new Collection();
    let isSaving = false;
    let confirmClose = false; // prevent close recursion
    let activeTab = TAB_FIELDS;
    let initialFormHash = calculateFormHash(project);

    $: schemaTabError =
        // extract the direct schema field error, otherwise - return a generic message
        typeof CommonHelper.getNestedVal($errors, "schema.message", null) === "string"
            ? CommonHelper.getNestedVal($errors, "schema.message")
            : "Has errors";

    $: isSystemUpdate = !project.isNew && project.system;

    $: hasChanges = initialFormHash != calculateFormHash(project);

    $: canSave = project.isNew || hasChanges;

    export function changeTab(newTab) {
        activeTab = newTab;
    }

    export function show(model) {
        load(model);

        confirmClose = true;

        changeTab(TAB_FIELDS);

        return projectPanel?.show();
    }

    export function hide() {
        return projectPanel?.hide();
    }

    async function load(model) {
        setErrors({}); // reset errors
        if (typeof model !== "undefined") {
            original = model;
            project = model?.clone();
        } else {
            original = null;
            project = new Collection();
        }
        // normalize
        project.schema = project.schema || [
          { name: "name", type: "string" }, 
          { name: "output", type: "string" }, 
          { name: "errors", type: "json" }, 
          { name: "meta", type: "json" }, 
          { name: "meta", type: "json" }, 
          { name: "started_at", type: "string" }, 
          { name: "ended_at", type: "string" }, 
          { name: "triggered_at", type: "date" },
          { name: "created", type: "date" },
          { name: "updated", type: "date" },
        ];
        project.originalName = project.name || "";

        await tick();

        initialFormHash = calculateFormHash(project);
    }

    function saveWithConfirm() {
        if (project.isNew) {
            return save();
        } else {
            confirmChangesPanel?.show(project);
        }
    }

    function save() {
        if (isSaving) {
            return;
        }

        isSaving = true;

        const data = exportFormData();

        let request;
        if (project.isNew) {
            request = ApiClient.collections.create(data);
        } else {
            request = ApiClient.collections.update(project.id, data);
        }

        request
            .then((result) => {
                confirmClose = false;
                hide();
                addSuccessToast(
                    project.isNew ? "Successfully created project." : "Successfully updated project."
                );
                addBenchmark(result);

                if (project.isNew) {
                    $activeBenchmark = result;
                }

                dispatch("save", result);
            })
            .catch((err) => {
                ApiClient.errorResponseHandler(err);
            })
            .finally(() => {
                isSaving = false;
            });
    }

    function exportFormData() {
        const data = project.export();
        data.schema = data.schema.slice(0);

        // remove deleted fields
        for (let i = data.schema.length - 1; i >= 0; i--) {
            const field = data.schema[i];
            if (field.toDelete) {
                data.schema.splice(i, 1);
            }
        }

        return data;
    }

    function deleteConfirm() {
        if (!original?.id) {
            return; // nothing to delete
        }

        confirm(`Do you really want to delete project "${original?.name}" and all its records?`, () => {
            return ApiClient.collections.delete(original?.id)
                .then(() => {
                    hide();
                    addSuccessToast(`Successfully deleted project "${original?.name}".`);
                    dispatch("delete", original);
                    removeBenchmark(original);
                })
                .catch((err) => {
                    ApiClient.errorResponseHandler(err);
                });
        });
    }

    function calculateFormHash(m) {
        return JSON.stringify(m);
    }
</script>

<OverlayPanel
    bind:this={projectPanel}
    class="overlay-panel-lg colored-header compact-header project-panel"
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
            {project.isNew ? "New project" : "Edit project"}
        </h4>

        {#if !project.isNew && !project.system}
            <div class="flex-fill" />
            <button type="button" class="btn btn-sm btn-circle btn-secondary flex-gap-0">
                <i class="ri-more-line" />
                <Toggler class="dropdown dropdown-right m-t-5">
                    <button type="button" class="dropdown-item closable" on:click={() => deleteConfirm()}>
                        <i class="ri-delete-bin-7-line" />
                        <span class="txt">Delete</span>
                    </button>
                </Toggler>
            </button>
        {/if}

        <form
            class="block"
            on:submit|preventDefault={() => {
                canSave && saveWithConfirm();
            }}
        >
            <Field
                class="form-field required m-b-0 {isSystemUpdate ? 'disabled' : ''}"
                name="name"
                let:uniqueId
            >
                <label for={uniqueId}>Name</label>
                <!-- svelte-ignore a11y-autofocus -->
                <input
                    type="text"
                    id={uniqueId}
                    required
                    disabled={isSystemUpdate}
                    spellcheck="false"
                    autofocus={project.isNew}
                    placeholder={`eg. "posts"`}
                    value={project.name}
                    on:input={(e) => {
                        project.name = CommonHelper.slugify(e.target.value);
                        e.target.value = project.name;
                    }}
                />
                {#if project.system}
                    <div class="help-block">System project</div>
                {/if}
            </Field>

            <input type="submit" class="hidden" tabindex="-1" />
        </form>

        <div class="tabs-header stretched">
            <button
                type="button"
                class="tab-item"
                class:active={activeTab === TAB_FIELDS}
                on:click={() => changeTab(TAB_FIELDS)}
            >
                <span class="txt">Fields</span>
                {#if !CommonHelper.isEmpty($errors?.schema)}
                    <i
                        class="ri-error-warning-fill txt-danger"
                        transition:scale|local={{ duration: 150, start: 0.7 }}
                        use:tooltip={schemaTabError}
                    />
                {/if}
            </button>

            <button
                type="button"
                class="tab-item"
                class:active={activeTab === TAB_RULES}
                on:click={() => changeTab(TAB_RULES)}
            >
                <span class="txt">API Rules</span>
                {#if !CommonHelper.isEmpty($errors?.listRule) || !CommonHelper.isEmpty($errors?.viewRule) || !CommonHelper.isEmpty($errors?.createRule) || !CommonHelper.isEmpty($errors?.updateRule) || !CommonHelper.isEmpty($errors?.deleteRule)}
                    <i
                        class="ri-error-warning-fill txt-danger"
                        transition:scale|local={{ duration: 150, start: 0.7 }}
                        use:tooltip={"Has errors"}
                    />
                {/if}
            </button>
        </div>
    </svelte:fragment>

    <div class="tabs-content">
        <!-- avoid rerendering the fields tab -->
        <div class="tab-item" class:active={activeTab === TAB_FIELDS}>
            <ProjectFieldsTab bind:project />
        </div>

        {#if activeTab === TAB_RULES}
            <div class="tab-item active">
                <ProjectRulesTab bind:project />
            </div>
        {/if}
    </div>

    <svelte:fragment slot="footer">
        <button type="button" class="btn btn-secondary" disabled={isSaving} on:click={() => hide()}>
            <span class="txt">Cancel</span>
        </button>
        <button
            type="button"
            class="btn btn-expanded"
            class:btn-loading={isSaving}
            disabled={!canSave || isSaving}
            on:click={() => saveWithConfirm()}
        >
            <span class="txt">{project.isNew ? "Create" : "Save changes"}</span>
        </button>
    </svelte:fragment>
</OverlayPanel>

<ProjectUpdateConfirm bind:this={confirmChangesPanel} on:confirm={() => save()} />

<style>
    .tabs-content {
        z-index: 3; /* autocomplete dropdown overlay fix */
    }
</style>
