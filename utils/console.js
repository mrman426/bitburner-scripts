/** 
 * @param {NS} ns 
 * @param boolean verbose 
 * @param string message
 */
export function log(ns, message, verbose = false) {
    if (verbose) {
        ns.tprint(message);
    }

    ns.print(message);
}

