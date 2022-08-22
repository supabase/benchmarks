<script>
    import "./scss/main.scss";

    import Router, { replace, link } from "svelte-spa-router";
    import active from "svelte-spa-router/active";
    import routes from "./routes";
    import ApiClient from "@/utils/ApiClient";
    import CommonHelper from "@/utils/CommonHelper";
    import tooltip from "@/actions/tooltip";
    import Toasts from "@/components/base/Toasts.svelte";
    import Toggler from "@/components/base/Toggler.svelte";
    import Confirmation from "@/components/base/Confirmation.svelte";
    import { pageTitle, appName } from "@/stores/app";
    import { admin } from "@/stores/admin";
    import { user } from "@/stores/user";
    import { setErrors } from "@/stores/errors";
    import { resetConfirmation } from "@/stores/confirmation";

    let oldLocation = undefined;

    let showAppSidebar = false;

    $: {
        loadAppName();
    }

    function handleRouteLoading(e) {
        if (e?.detail?.location === oldLocation) {
            return; // not an actual change
        }

        showAppSidebar = !!e?.detail?.userData?.showAppSidebar;

        oldLocation = e?.detail?.location;

        // resets
        $pageTitle = "";
        setErrors({});
        resetConfirmation();
    }

    function handleRouteFailure() {
        replace("/");
    }

    async function loadAppName() {
        try {
            $appName = "supabench";
        } catch (err) {
            console.warn("Failed to load app name.", err);
        }
    }

    function logout() {
        ApiClient.logout();
    }
</script>

<svelte:head>
    <title>{CommonHelper.joinNonEmpty([$pageTitle, $appName, "Supabase"], " - ")}</title>
</svelte:head>

<div class="app-layout">
    {#if showAppSidebar}
        <aside class="app-sidebar">
            <a href="/" class="logo logo-sm" use:link>
                <img
                    src="{import.meta.env.BASE_URL}images/logo.svg"
                    alt="Supabase logo"
                    width="40"
                    height="40"
                />
            </a>

            <nav class="main-menu">
                <a
                    href="/projects"
                    class="menu-item"
                    aria-label="Projects"
                    use:link
                    use:active={{ path: "/projects/?.*", className: "current-route" }}
                    use:tooltip={{ text: "Projects", position: "right" }}
                >
                    <i class="ri-git-repository-line" />
                </a>
            </nav>
            {#if $user?.id || $admin?.id}
                <figure class="thumb thumb-circle link-hint closable">
                    <img
                        src="{import.meta.env.BASE_URL}images/avatars/avatar{$admin?.avatar || $user?.avatar || Math.floor(Math.random() * 9)}.svg"
                        alt="Avatar"
                    />
                    <Toggler class="dropdown dropdown-nowrap dropdown-upside dropdown-left">
                        {#if $admin?.id}
                            <a href="/settings/admins" class="dropdown-item closable" use:link>
                                <i class="ri-shield-user-line" />
                                <span class="txt">Manage admins</span>
                            </a>
                            <hr />
                        {/if}
                        <div tabindex="0" class="dropdown-item closable" on:click={logout}>
                            <i class="ri-logout-circle-line" />
                            <span class="txt">Logout</span>
                        </div>
                    </Toggler>
                </figure>
            {:else}
                <figure class="thumb thumb-circle link-hint closable">
                    <img
                        src="{import.meta.env.BASE_URL}images/avatars/avatar{Math.floor(Math.random() * 9)}.svg"
                        alt="Avatar"
                    />
                    <Toggler class="dropdown dropdown-nowrap dropdown-upside dropdown-left">
                        <a
                            href="/login"
                            class="menu-item"
                            aria-label="Login"
                            use:link
                            use:active={{ path: "/login/?.*", className: "current-route" }}
                            use:tooltip={{ text: "Login", position: "right" }}
                        >
                            <div tabindex="0" class="dropdown-item closable">
                              <i class="ri-logout-circle-line" />
                              <span class="txt">Login</span>
                            </div>
                        </a>
                    </Toggler>
                </figure>
            {/if}
        </aside>
    {/if}

    <div class="app-body">
        <Router {routes} on:routeLoading={handleRouteLoading} on:conditionsFailed={handleRouteFailure} />
    </div>

    <div class="app-footer">
      <div class="footer-item">
        <a href="https://supabase.com/?ref=supabench" rel=external target="_blank" use:link>
          <span>Made by Supabase</span>
        </a>
      </div>
      <div class="footer-item">
        <a href="https://pocketbase.io/" rel=external target="_blank" use:link>
          <span>Powered by PocketBase</span>
        </a>
      </div>
      <div class="footer-item">
          <span>
            Using 
            <a href="https://www.terraform.io/" rel=external target="_blank" use:link>
              Terraform
            </a>
              and
            <a href="https://k6.io/" rel=external target="_blank" use:link>
              Grafana K6
            </a>
          </span>
      </div>
    </div>
</div>

<Toasts />

<Confirmation />
