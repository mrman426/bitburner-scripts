/** @param {NS} ns */
export async function main(ns) {
    const loop = ns.args[0];
    do {
        await ns.share();
    } while (loop);
} 