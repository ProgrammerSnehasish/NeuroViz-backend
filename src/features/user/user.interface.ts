import { User } from "@prisma/client";

export interface IUserDetails extends Omit<User, 'password'|'hasId'|'save'|'remove'|'softRemove'|'recover'|'reload'> {
}

