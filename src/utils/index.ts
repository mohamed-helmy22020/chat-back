export function flattenObject(
    obj: Record<string, any>,
    prefix = ""
): Record<string, any> {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix ? `${prefix}.` : "";
        const value = obj[key];

        if (
            value != null &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            Object.assign(acc, flattenObject(value, pre + key));
        } else {
            acc[pre + key] = value;
        }
        return acc;
    }, {} as Record<string, any>);
}
export { randomBetween } from "./randomInteger";
