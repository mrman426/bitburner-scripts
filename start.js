/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--verbose-hacked"];
}

/** @param {NS} ns */
export async function main(ns) {
    const verboseHacked = ns.args.includes("--verbose-hacked");
    const verboseToast = ns.args.includes("--toast-hacked");

    ns.exec("nuke-targets.js", "home", 1, "--loop");
    ns.exec("purchase-servers.js", "home", 1, "--loop");

    ns.exec("deploy-attack.js", "home", 1, "n00dles", "--hacked-only", "--loop", 
        ...(verboseHacked ? ["--verbose-hacked"] : []), 
        ...(verboseToast ? ["--toast-hacked"] : []));


    while (ns.ps("home").some(proc => proc.filename === "deploy-attack.js")) {
        await ns.sleep(1000);
    }

    ns.exec("deploy-wgh.js", "home", 1, "--purchased-only", "--loop", 
        ...(verboseHacked ? ["--verbose-hacked"] : []), 
        ...(verboseToast ? ["--toast-hacked"] : []));
}