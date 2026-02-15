import { Server } from "socket.io";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getIO = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(global as any).io) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (global as any).io as Server;
};
