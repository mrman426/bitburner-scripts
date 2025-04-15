/** @param {NS} ns */
export async function main(ns) {
    ns.exec("purchase-servers.js", "home", 1, "--loop")
    ns.exec("deploy-attack.js", "home", 1, "n00dles", "--hacked-only", "--loop")
    ns.exec("deploy-wgh.js", "home", 1, "--purchased-only", "--loop")
}