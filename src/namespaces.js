
const namespacesFilename = "namespaces.json";

/**
 * Returns a list of all built-in namespaces, AKA the datablock sets that can be used natively without any uploads.
 */
export async function loadBuiltInNamespaces() {
    let response = await fetch("public/data/" + namespacesFilename);
    return await response.json();
}