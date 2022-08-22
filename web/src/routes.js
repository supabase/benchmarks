import { replace } from "svelte-spa-router";
import { wrap } from "svelte-spa-router/wrap";
import ApiClient from "@/utils/ApiClient";
import PageIndex from "@/components/PageIndex.svelte";
import PageRecords from "@/components/records/PageRecords.svelte";
import PageAdminLogin from "@/components/admins/PageAdminLogin.svelte";

const baseConditions = [
    async (details) => {
        const realQueryParams = new URLSearchParams(window.location.search);

        if (details.location !== "/" && realQueryParams.has(import.meta.env.PB_INSTALLER_PARAM)) {
            return replace("/");
        }

        return true;
    },
];

const routes = {
    "/login": wrap({
        component: PageAdminLogin,
        conditions: baseConditions.concat([(_) => !ApiClient.authStore.isValid]),
        userData: { showAppSidebar: false },
    }),

    "/request-password-reset": wrap({
        asyncComponent: () => import("@/components/admins/PageAdminRequestPasswordReset.svelte"),
        conditions: baseConditions.concat([(_) => !ApiClient.authStore.isValid]),
        userData: { showAppSidebar: false },
    }),

    "/confirm-password-reset/:token": wrap({
        asyncComponent: () => import("@/components/admins/PageAdminConfirmPasswordReset.svelte"),
        conditions: baseConditions.concat([(_) => !ApiClient.authStore.isValid]),
        userData: { showAppSidebar: false },
    }),

    "/projects": wrap({
        component: PageRecords,
        // conditions: baseConditions.concat([(_) => ApiClient.authStore.isValid]),
        userData: { showAppSidebar: true },
    }),

    "/users/confirm-password-reset/:token": wrap({
        asyncComponent: () => import("@/components/users/PageUserConfirmPasswordReset.svelte"),
        conditions: baseConditions.concat([
            () => {
                // ensure that there is no authenticated user/admin model
                ApiClient.logout(false);
                return true;
            },
        ]),
        userData: { showAppSidebar: false },
    }),

    "/users/confirm-verification/:token": wrap({
        asyncComponent: () => import("@/components/users/PageUserConfirmVerification.svelte"),
        conditions: baseConditions.concat([
            () => {
                // ensure that there is no authenticated user/admin model
                ApiClient.logout(false);
                return true;
            },
        ]),
        userData: { showAppSidebar: false },
    }),

    "/users/confirm-email-change/:token": wrap({
        asyncComponent: () => import("@/components/users/PageUserConfirmEmailChange.svelte"),
        conditions: baseConditions.concat([
            () => {
                // ensure that there is no authenticated user/admin model
                ApiClient.logout(false);
                return true;
            },
        ]),
        userData: { showAppSidebar: false },
    }),

    // fallback
    "*": wrap({
        component: PageIndex,
        userData: { showAppSidebar: false },
    }),
};

export default routes;
