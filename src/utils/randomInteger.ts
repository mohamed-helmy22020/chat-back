export const randomBetween = (first: number, end: number) => {
    return Math.floor(Math.random() * (end - first + 1) + first);
};
