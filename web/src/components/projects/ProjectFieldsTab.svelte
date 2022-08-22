<script>
    import { SchemaField } from "pocketbase";
    import FieldAccordion from "@/components/projects/FieldAccordion.svelte";

    const reservedNames = ["id", "created", "updated"];

    export let project = {};

    $: if (typeof project?.schema === "undefined") {
        project = project || {};
        project.schema = [
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
    }

    function removeField(fieldIndex) {
        if (project.schema[fieldIndex]) {
            project.schema.splice(fieldIndex, 1);
            project.schema = project.schema;
        }
    }

    function newField() {
        const field = new SchemaField({
            name: getUniqueFieldName(),
        });

        project.schema.push(field);
        project.schema = project.schema;
    }

    function getUniqueFieldName(base = "field") {
        let counter = "";

        while (hasFieldWithName(base + counter)) {
            ++counter;
        }

        return base + counter;
    }

    function hasFieldWithName(name) {
        return !!project.schema.find((field) => field.name === name);
    }

    function getSiblingsFieldNames(currentField) {
        let result = [];

        if (currentField.toDelete) {
            return result;
        }

        for (let field of project.schema) {
            if (field === currentField || field.toDelete) {
                continue; // skip current and deleted fields
            }

            result.push(field.name);
        }

        return result;
    }
</script>

<div class="accordions">
    {#each project.schema as field, i (i)}
        <FieldAccordion
            bind:field
            key={i}
            excludeNames={reservedNames.concat(getSiblingsFieldNames(field))}
            on:remove={() => removeField(i)}
        />
    {/each}
</div>

<div class="clearfix m-t-xs" />

<button
    type="button"
    class="btn btn-block {project.schema?.length ? 'btn-secondary' : 'btn-success'}"
    on:click={newField}
>
    <i class="ri-add-line" />
    <span class="txt">New field</span>
</button>
