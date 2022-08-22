<script>
    import { replace, querystring } from "svelte-spa-router";
    import {
        benchmarks,
        activeBenchmark,
        isBenchmarksLoading,
        loadBenchmarks,
    } from "@/stores/benchmarks";
    import { loadProjects } from "@/stores/projects";
    import tooltip from "@/actions/tooltip";
    import { pageTitle } from "@/stores/app";
    import { admin } from "@/stores/admin";
    import { user } from "@/stores/user";
    import Searchbar from "@/components/base/Searchbar.svelte";
    import RefreshButton from "@/components/base/RefreshButton.svelte";
    import ProjectsSidebar from "@/components/projects/ProjectsSidebar.svelte";
    import ProjectUpsertPanel from "@/components/projects/ProjectUpsertPanel.svelte";
    import RecordUpsertPanel from "@/components/records/RecordUpsertPanel.svelte";
    import RecordsList from "@/components/records/RecordsList.svelte";
    import RunsChart from "@/components/charts/RunsChart.svelte";

    $pageTitle = "Projects";

    const queryParams = new URLSearchParams($querystring);

    let projectUpsertPanel;
    let projectDocsPanel;
    let recordPanel;
    let recordsList;
    let filter = queryParams.get("filter") || "";
    let sort = queryParams.get("sort") || "-triggered_at";
    let selectedProjectId = queryParams.get("projectId") || "";

    $: viewableProjects = $benchmarks.filter((c) => c.name != import.meta.env.PB_PROFILE_COLLECTION);

    // reset filter and sort on project change
    $: if ($activeBenchmark?.id && selectedProjectId != $activeBenchmark.id) {
        reset();
    }

    // keep the url params in sync
    $: if (sort || filter || $activeBenchmark?.id) {
        const query = new URLSearchParams({
            projectId: $activeBenchmark?.id || "",
            filter: filter,
            sort: sort,
        }).toString();
        replace("/projects?" + query);
    }

    function reset() {
        selectedProjectId = $activeBenchmark.id;
        sort = "-triggered_at";
        filter = "";
    }

    loadBenchmarks(selectedProjectId);
    loadProjects()
</script>

{#if $isBenchmarksLoading}
    <div class="placeholder-section m-b-base">
        <span class="loader loader-lg" />
        <h1>Loading projects...</h1>
    </div>
{:else if !viewableProjects.length}
    <div class="placeholder-section m-b-base">
        <div class="icon">
            <i class="ri-database-2-line" />
        </div>
        <h1 class="m-b-10">There are no projects yet.</h1>
    </div>
{:else}
    <ProjectsSidebar />

    <main class="page-wrapper">
        <header class="page-header">
            <nav class="breadcrumbs">
                <div class="breadcrumb-item">Projects</div>
                <div class="breadcrumb-item">{$activeBenchmark["@expand"].project_id.name}</div>
                <div class="breadcrumb-item">{$activeBenchmark.name}</div>
            </nav>

            <RefreshButton on:refresh={() => recordsList?.load()} />
            {#if $user?.id || $admin?.id}
                <div class="btns-group">
                    <button type="button" class="btn btn-expanded btn-success" on:click={() => recordPanel?.show()}>
                        <i class="ri-play-list-2-fill" />
                        <span class="txt">New run</span>
                    </button>
                </div>
            {/if}
        </header>

        <Searchbar
            value={filter}
            autocompleteProject={$activeBenchmark}
            on:submit={(e) => (filter = e.detail)}
        />

        <div class="clearfix m-b-xs" />

        <RunsChart bind:filter bind:projectId={$activeBenchmark.id} />

        <RecordsList
            bind:this={recordsList}
            project={$activeBenchmark}
            bind:filter
            bind:sort
            on:select={(e) => recordPanel?.show(e?.detail)}
        />
    </main>
{/if}

<ProjectUpsertPanel bind:this={projectUpsertPanel} />

<RecordUpsertPanel
    bind:this={recordPanel}
    project={$activeBenchmark}
    on:save={() => recordsList?.load()}
    on:delete={() => recordsList?.load()}
/>
