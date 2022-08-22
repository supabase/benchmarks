import { writable } from "svelte/store";

// logged app admin
export const user = writable({});

export function setUser(model) {
    user.set(model || {});
}
