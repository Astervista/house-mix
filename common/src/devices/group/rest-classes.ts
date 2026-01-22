
export interface GroupCreateOptions {
    parent?: string;
}

// TODO: We need validation
export interface GroupEditChanges {
    name?: string;
    displayName?: string;
}

// TODO: should be moved
export interface EntityPathParams {
    name: string;
}

export interface ChangeParentChange {
    parent: string | null;
}

export enum DeleteGroupChildFate {
    CURRENT_LEVEL = "CURRENT_LEVEL",
    ROOT_LEVEL    = "ROOT_LEVEL",
    CHOOSE_WHERE  = "CHOOSE_WHERE"
}

export type DeleteGroupOptions = {
    fate: DeleteGroupChildFate.CURRENT_LEVEL | DeleteGroupChildFate.ROOT_LEVEL | null
} | {
    fate: DeleteGroupChildFate.CHOOSE_WHERE
    parent: string
}
