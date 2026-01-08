import { ZodDefault, ZodNullable, ZodOptional, type ZodType } from "zod";

export function isOptionalType(zodType: ZodType): boolean {
  return (
    zodType instanceof ZodOptional ||
    zodType instanceof ZodDefault ||
    zodType instanceof ZodNullable
  );
}

export function unwrapZodType(zodType: ZodType): ZodType {
  if (zodType instanceof ZodOptional) {
    return unwrapZodType((zodType as ZodOptional<any>).unwrap());
  }
  if (zodType instanceof ZodDefault) {
    return unwrapZodType((zodType as ZodDefault<any>).unwrap());
  }
  if (zodType instanceof ZodNullable) {
    return unwrapZodType((zodType as ZodNullable<any>).unwrap());
  }
  return zodType;
}
