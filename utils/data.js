/** 
 * @param {NS} ns 
 * @param {string[]} data
 */
export async function saveAttack(ns, startTime, host, target, type, threads, securityLevel, moneyAvailable, moneyHacked) {
    const datetime = (new Date()).getTime()
    await saveData(ns, {datetime, startTime, host, target, type, threads, securityLevel, moneyAvailable, moneyHacked})
}

/** 
 * @param {NS} ns 
 * @param {string[]} data
 */
export async function saveData(ns, data) {
	const dataPort = ns.getPortHandle(1)
    let write
    do {
        write = dataPort.tryWrite(JSON.stringify(data))
        if (!write) {
            ns.tprint("WARNING: Port 1 is full, waiting to write data. Are you running 'collect-data.js'?")
            await ns.sleep(1000)
        }
    } while(!write)
}