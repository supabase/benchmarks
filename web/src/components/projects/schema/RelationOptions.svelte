<script>
    import ApiClient from "@/utils/ApiClient";
    import CommonHelper from "@/utils/CommonHelper";
    import Field from "@/components/base/Field.svelte";
    import ObjectSelect from "@/components/base/ObjectSelect.svelte";

    export let key = "";
    export let options = {};

    const defaultOptions = [
        { label: "False", value: false },
        { label: "True", value: true },
    ];

    let isLoading = false;
    let projects = [];

    // load defaults
    $: if (CommonHelper.isEmpty(options)) {
        options = {
            maxSelect: 1,
            projectId: null,
            cascadeDelete: false,
        };
    }

    loadProjects();

    function loadProjects() {
        isLoading = true;

        ApiClient.Records.getFullList("benchmarks", 200, { sort: "-created" })
            .then((items) => {
                projects = items;
            })
            .catch((err) => {
                ApiClient.errorResponseHandler(err);
            })
            .finally(() => {
                isLoading = false;
            });
    }
</script>

<div class="grid">
    <div class="col-sm-9">
        <Field class="form-field required" name="schema.{key}.options.projectId" let:uniqueId>
            <label for={uniqueId}>Project</label>
            <ObjectSelect
                searchable={projects.length > 5}
                selectPlaceholder={isLoading ? "Loading..." : "Select project"}
                noOptionsText="No projects found"
                selectionKey="id"
                items={projects}
                bind:keyOfSelected={options.projectId}
            />
        </Field>
    </div>
    <div class="col-sm-3">
        <Field class="form-field required" name="schema.{key}.options.maxSelect" let:uniqueId>
            <label for={uniqueId}>Max select</label>
            <input type="number" id={uniqueId} step="1" min="1" required bind:value={options.maxSelect} />
        </Field>
    </div>
    <div class="col-sm-12">
        <Field class="form-field" name="schema.{key}.options.cascadeDelete" let:uniqueId>
            <label for={uniqueId}>Delete record on relation delete</label>
            <ObjectSelect id={uniqueId} items={defaultOptions} bind:keyOfSelected={options.cascadeDelete} />
        </Field>
    </div>
</div>
