import { writable } from "svelte/store";
import ApiClient from "@/utils/ApiClient";
import CommonHelper from "@/utils/CommonHelper";

export const projects = writable([]);
export const activeProject = writable({});
export const isProjectsLoading = writable(false);

// add or update project
export function addProject(project) {
    activeProject.update((current) => {
        return CommonHelper.isEmpty(current?.id) || current.id === project.id ? project : current;
    });

    projects.update((list) => {
        CommonHelper.pushOrReplaceByKey(list, project, "id");
        return list;
    });
}

export function removeProject(project) {
    projects.update((list) => {
        CommonHelper.removeByKey(list, "id", project.id);

        activeProject.update((current) => {
            if (current.id === project.id) {
                // fallback to the first non-profile project item
                return list.find((c) => c.name != import.meta.env.PB_PROFILE_COLLECTION) || {};
            }
            return current;
        });

        return list;
    });
}

// load all projects (excluding the user profile)
export async function loadProjects(activeId = null) {
    isProjectsLoading.set(true);

    activeProject.set({});
    projects.set([]);

    return ApiClient.Records.getFullList("projects", 200, { sort: "-created" })
        .then((items) => {
            projects.set(items);

            const item = activeId && CommonHelper.findByKey(items, "id", activeId);
            if (item) {
                activeProject.set(item);
            } else if (items.length) {
                // fallback to the first non-profile project item
                const nonProfile = items.find((c) => c.name != import.meta.env.PB_PROFILE_COLLECTION);
                if (nonProfile) {
                    activeProject.set(nonProfile);
                }
            }
        })
        .catch((err) => {
            ApiClient.errorResponseHandler(err);
        })
        .finally(() => {
            isProjectsLoading.set(false);
        });
}

export function getProject(id) {
    return ApiClient.Records.getOne("projects", id, {});
}
