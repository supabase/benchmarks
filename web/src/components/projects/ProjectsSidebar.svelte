<script>
    import { benchmarks, activeBenchmark } from "@/stores/benchmarks";
    import { projects, loadProjects } from "@/stores/projects";
    import ProjectUpsertPanel from "@/components/projects/ProjectUpsertPanel.svelte";
    import { admin } from "@/stores/admin";

    let projectPanel;
    let searchTerm = "";

    $: normalizedSearch = searchTerm.replace(/\s+/g, "").toLowerCase();

    $: hasSearch = searchTerm !== "";

    let filteredProjects
    $: filteredProjects = groupByProject($benchmarks.filter((project) => {
        return (
            project.name != import.meta.env.PB_PROFILE_COLLECTION &&
            (project.id == searchTerm ||
                project.name.replace(/\s+/g, "").toLowerCase().includes(normalizedSearch) ||
                project["@expand"].project_id == searchTerm ||
                project["@expand"].project_id.name.toLowerCase().includes(normalizedSearch))
        );
    }), "project_id");

    let projs
    $: (async () => {
        projs = await loadProjects();
    })();

    function groupByProject(xs, key) {
      const map = xs.reduce(function(rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
      }, {});
      return Object.keys(map).map((key) => {
        return {
          name: map[key][0]["@expand"].project_id.name,
          key: key,
          values: map[key]
        };
      });
    };

    function selectProject(project) {
        $activeBenchmark = project;
    }
</script>

<aside class="page-sidebar project-sidebar">
    <header class="sidebar-header">
        <div class="form-field search" class:active={hasSearch}>
            <div class="form-field-addon">
                <button
                    type="button"
                    class="btn btn-xs btn-secondary btn-circle btn-clear"
                    class:hidden={!hasSearch}
                    on:click={() => (searchTerm = "")}
                >
                    <i class="ri-close-line" />
                </button>
            </div>
            <input type="text" placeholder="Search benchmarks..." bind:value={searchTerm} />
        </div>
    </header>

    <hr class="m-t-5 m-b-xs" />

    <div class="sidebar-content">
        {#each filteredProjects as group}
            <div style="display: flex; align-items: center; column-gap: 10px; color: var(--txtHintColor);">
                <p class="txt-hint m-t-10 m-b-10 txt-left">{group.name}</p>
            </div>
            <hr class="m-t-5 m-b-xs" />
            {#each group.values as project (project.id)}
                <div
                    tabindex="0"
                    class="sidebar-list-item"
                    class:active={$activeBenchmark?.id === project.id}
                    on:click={() => selectProject(project)}
                >
                    {#if $activeBenchmark?.id === project.id}
                        <i class="ri-folder-open-line" />
                    {:else}
                        <i class="ri-folder-2-line" />
                    {/if}
                    <span class="txt">{project.name}</span>
                </div>
            {:else}
                {#if normalizedSearch.length}
                    <p class="txt-hint m-t-10 m-b-10 txt-center">No projects found.</p>
                {/if}
            {/each}
        {/each}
    </div>
</aside>

<ProjectUpsertPanel bind:this={projectPanel} />
