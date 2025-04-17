/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--verbose-hacked", "--toast-hacked"];
}

/** @param {NS} ns */
export async function main(ns) {
    const verboseHacked = ns.args.includes("--verbose-hacked");
    const verboseToast = ns.args.includes("--toast-hacked");
    const money = ns.getServerMoneyAvailable("home");

    ns.exec("collect-data.js", "home", 1);
    ns.exec("nuke-targets.js", "home", 1, "--loop");
    ns.exec("purchase-servers.js", "home", 1, "--loop");

    if (money < 5000000) {
        ns.exec("deploy-attack.js", "home", 1, "n00dles", "--loop", 
            ...(verboseHacked ? ["--verbose-hacked"] : []), 
            ...(verboseToast ? ["--toast-hacked"] : []));

        while (ns.ps("home").some(proc => proc.filename === "deploy-attack.js")) {
            await ns.sleep(10000);
        }
    }

    ns.exec("deploy-wgh.js", "home", 1, "--loop", 
        ...(verboseHacked ? ["--verbose-hacked"] : []), 
        ...(verboseToast ? ["--toast-hacked"] : []));
}