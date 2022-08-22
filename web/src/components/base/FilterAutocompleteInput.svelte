<script>
    /**
     * This component uses Codemirror editor under the hood and its a "little heavy".
     * To allow manuall chunking it is recommended to load the component lazily!
     *
     * Example usage:
     * ```
     * <script>
     * import { onMount } from "svelte";
     *
     * let inputComponent;
     *
     * onMount(async () => {
     *     try {
     *         inputComponent = (await import("@/components/base/FilterAutocompleteInput.svelte")).default;
     *     } catch (err) {
     *         console.warn(err);
     *     }
     * });
     * <//script>
     *
     * ...
     *
     * <svelte:component
     *     this={inputComponent}
     *     bind:value={value}
     *     baseProject={baseProject}
     *     disabled={disabled}
     * />
     * ```
     */
    import { onMount, createEventDispatcher } from "svelte";
    import CommonHelper from "@/utils/CommonHelper";
    import { benchmarks } from "@/stores/benchmarks";
    import { Collection } from "pocketbase";
    // code mirror imports
    // ---
    import {
        keymap,
        highlightSpecialChars,
        drawSelection,
        dropCursor,
        rectangularSelection,
        highlightActiveLineGutter,
        EditorView,
        placeholder as placeholderExt,
    } from "@codemirror/view";
    import { EditorState, Compartment } from "@codemirror/state";
    import {
        defaultHighlightStyle,
        syntaxHighlighting,
        bracketMatching,
        StreamLanguage,
    } from "@codemirror/language";
    import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
    import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
    import {
        autocompletion,
        completionKeymap,
        closeBrackets,
        closeBracketsKeymap,
    } from "@codemirror/autocomplete";
    import { simpleMode } from "@codemirror/legacy-modes/mode/simple-mode";
    // ---

    const dispatch = createEventDispatcher();

    export let value = "";
    export let disabled = false;
    export let placeholder = "";
    export let baseProject = new Collection();
    export let singleLine = false;
    export let extraAutocompleteKeys = []; // eg. ["test1", "test2"]
    export let disableRequestKeys = false;
    export let disableIndirectProjectsKeys = false;

    let editor;
    let container;
    let langCompartment = new Compartment();
    let editableCompartment = new Compartment();
    let readOnlyCompartment = new Compartment();
    let placeholderCompartment = new Compartment();

    $: mergedProjects = mergeWithBaseProject($benchmarks);

    $: if (editor && baseProject?.schema) {
        editor.dispatch({
            effects: [langCompartment.reconfigure(ruleLang())],
        });
    }

    $: if (editor && typeof disabled !== "undefined") {
        editor.dispatch({
            effects: [
                editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
                readOnlyCompartment.reconfigure(EditorState.readOnly.of(disabled)),
            ],
        });

        triggerNativeChange();
    }

    $: if (editor && value != editor.state.doc.toString()) {
        editor.dispatch({
            changes: {
                from: 0,
                to: editor.state.doc.length,
                insert: value,
            },
        });
    }

    $: if (editor && typeof placeholder !== "undefined") {
        editor.dispatch({
            effects: [placeholderCompartment.reconfigure(placeholderExt(placeholder))],
        });
    }

    // Focus the editor (if inited).
    export function focus() {
        editor?.focus();
    }

    // Replace the base project in the provided list.
    function mergeWithBaseProject(projects) {
        let copy = projects.slice();
        CommonHelper.pushOrReplaceByKey(copy, baseProject, "id");
        return copy;
    }

    // Emulate native change event for the editor container element.
    function triggerNativeChange() {
        container?.dispatchEvent(
            new CustomEvent("change", {
                detail: { value },
                bubbles: true,
            })
        );
    }

    // Returns list with all project field keys recursively.
    function getProjectFieldKeys(nameOrId, prefix = "", level = 0) {
        let project = mergedProjects.find((item) => item.name == nameOrId || item.id == nameOrId);
        if (!project || level >= 4) {
            return [];
        }

        let result = [
            // base model fields
            prefix + "id",
            prefix + "created",
            prefix + "updated",
        ];

        for (const field of [
          { name: "name", type: "string" }, 
          { name: "origin", type: "string" }, 
          { name: "status", type: "string" }, 
          { name: "output", type: "string" }, 
          { name: "errors", type: "json" }, 
          { name: "meta", type: "json" }, 
          { name: "raw", type: "json" }, 
          { name: "started_at", type: "string" }, 
          { name: "ended_at", type: "string" }, 
          { name: "triggered_at", type: "date" },
          { name: "created", type: "date" },
          { name: "updated", type: "date" },
        ]) {
            const key = prefix + field.name;
            if (field.type === "relation" && field.options.projectId) {
                const subKeys = getProjectFieldKeys(field.options.projectId, key + ".", level + 1);
                if (subKeys.length) {
                    result = result.concat(subKeys);
                } else {
                    result.push(key);
                }
            } else {
                result.push(key);
            }
        }

        return result;
    }

    // Returns an array with all the supported keys.
    function getAllKeys(includeRequestKeys = true, includeIndirectProjectsKeys = true) {
        let result = [].concat(extraAutocompleteKeys);

        // add base keys
        const baseKeys = getProjectFieldKeys(baseProject.name);
        for (const key of baseKeys) {
            result.push(key);
        }

        // add base request keys
        if (includeRequestKeys) {
            result.push("@request.method");
            result.push("@request.query.");
            result.push("@request.data.");
            result.push("@request.user.id");
            result.push("@request.user.email");
            result.push("@request.user.verified");
            result.push("@request.user.created");
            result.push("@request.user.updated");
        }

        // add @projects and  @request.user.profile keys
        if (includeRequestKeys || includeIndirectProjectsKeys) {
            for (const project of mergedProjects) {
                let prefix = "";
                if (project.name === import.meta.env.PB_PROFILE_COLLECTION) {
                    if (!includeRequestKeys) {
                        continue;
                    }
                    prefix = "@request.user.profile.";
                } else {
                    if (!includeIndirectProjectsKeys) {
                        continue;
                    }
                    prefix = "@project." + project.name + ".";
                }

                const keys = getProjectFieldKeys(project.name, prefix);
                for (const key of keys) {
                    result.push(key);
                }
            }
        }

        // sort longer keys first because the highlighter will highlight
        // the first match and stops until an operator is found
        result.sort(function (a, b) {
            return b.length - a.length;
        });

        return result;
    }

    // Returns object with all the completions matching the context.
    function completions(context) {
        let word = context.matchBefore(/[\@\w\.]*/);
        if (word.from == word.to && !context.explicit) {
            return null;
        }

        let options = [{ label: "false" }, { label: "true" }];

        if (!disableIndirectProjectsKeys) {
            options.push({ label: "@project.*", apply: "@project." });
        }

        const skipFields = [
            "@request.user.profile.id",
            "@request.user.profile.userId",
            "@request.user.profile.created",
            "@request.user.profile.updated",
        ];

        const keys = getAllKeys(!disableRequestKeys, !disableRequestKeys && word.text.startsWith("@c"));
        for (const key of keys) {
            if (skipFields.includes(key)) {
                continue;
            }

            options.push({
                label: key.endsWith(".") ? key + "*" : key,
                apply: key,
            });
        }

        return {
            from: word.from,
            options: options,
        };
    }

    // Returns all field keys as keyword patterns to highlight.
    function keywords() {
        const result = [];
        const keys = getAllKeys(!disableRequestKeys, !disableIndirectProjectsKeys);

        for (const key of keys) {
            let pattern;
            if (key.endsWith(".")) {
                pattern = CommonHelper.escapeRegExp(key) + "\\w+[\\w.]*";
            } else {
                pattern = CommonHelper.escapeRegExp(key);
            }

            result.push({ regex: pattern, token: "keyword" });
        }

        return result;
    }

    // Creates a new language mode.
    // @see https://codemirror.net/5/demo/simplemode.html
    function ruleLang() {
        return StreamLanguage.define(
            simpleMode({
                start: [
                    // base literals
                    {
                        regex: /true|false|null/,
                        token: "atom",
                    },
                    // double quoted string
                    { regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: "string" },
                    // single quoted string
                    { regex: /'(?:[^\\]|\\.)*?(?:'|$)/, token: "string" },
                    // numbers
                    {
                        regex: /0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/i,
                        token: "number",
                    },
                    // operators
                    {
                        regex: /\&\&|\|\||\=|\!\=|\~|\!\~|\>|\<|\>\=|\<\=/,
                        token: "operator",
                    },
                    // indent and dedent properties guide autoindentation
                    { regex: /[\{\[\(]/, indent: true },
                    { regex: /[\}\]\)]/, dedent: true },
                ].concat(keywords()),
            })
        );
    }

    onMount(() => {
        const submitShortcut = {
            key: "Enter",
            run: (_) => {
                // trigger submit on enter for singleline input
                if (singleLine) {
                    dispatch("submit", value);
                }
            },
        };

        editor = new EditorView({
            parent: container,
            state: EditorState.create({
                doc: value,
                extensions: [
                    highlightActiveLineGutter(),
                    highlightSpecialChars(),
                    history(),
                    drawSelection(),
                    dropCursor(),
                    EditorState.allowMultipleSelections.of(true),
                    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                    bracketMatching(),
                    closeBrackets(),
                    rectangularSelection(),
                    highlightSelectionMatches(),
                    keymap.of([
                        submitShortcut,
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                        ...completionKeymap,
                    ]),
                    EditorView.lineWrapping,
                    autocompletion({
                        override: [completions],
                        icons: false,
                    }),
                    placeholderCompartment.of(placeholderExt(placeholder)),
                    editableCompartment.of(EditorView.editable.of(true)),
                    readOnlyCompartment.of(EditorState.readOnly.of(false)),
                    langCompartment.of(ruleLang()),
                    EditorState.transactionFilter.of((tr) => {
                        return singleLine && tr.newDoc.lines > 1 ? [] : tr;
                    }),
                    EditorView.updateListener.of((v) => {
                        if (!v.docChanged || disabled) {
                            return;
                        }
                        value = v.state.doc.toString();
                        triggerNativeChange();
                    }),
                ],
            }),
        });

        return () => editor?.destroy();
    });
</script>

<div bind:this={container} class="code-editor" />
