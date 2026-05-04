import { IsNotEmpty, IsUUID } from "class-validator";

export class CreateClassdto {
    @IsNotEmpty()
    name: string
}