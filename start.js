/** @param {NS} ns */
export async function main(ns) {
    ns.exec("nuke-targets.js", "home", 1, "--loop")
    ns.exec("purchase-servers.js", "home", 1, "--loop")
    ns.exec("deploy-attack.js", "home", 1, "n00dles", "--hacked-only", "--loop", "--verbose-hacked")
    await ns.sleep(10000);
    ns.exec("deploy-wgh.js", "home", 1, "--purchased-only", "--loop", "--verbose-hacked")
}