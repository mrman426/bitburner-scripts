/** @param {NS} ns */
export async function main(ns) {
    // Get the target server from the arguments, default to "home"
    const targetServer = ns.args[0] || "home";

    // Get a list of all files on the target server
    const files = ns.ls(targetServer, ".js");

    if (files.length === 0) {
        ns.tprint(`INFO: No scripts found on ${targetServer} to delete.`);
        return;
    }

    // Delete each script
    for (const file of files) {
        const success = ns.rm(file, targetServer);
        if (success) {
            ns.tprint(`SUCCESS: Deleted ${file} from ${targetServer}`);
        } else {
            ns.tprint(`ERROR: Failed to delete ${file} from ${targetServer}`);
        }
    }

    ns.tprint(`INFO: Finished deleting scripts on ${targetServer}.`);
}