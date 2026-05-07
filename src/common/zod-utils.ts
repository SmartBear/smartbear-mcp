import {
  ZodAny,
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodString,
  type ZodType,
  ZodUnion,
} from "zod";

export function unwrapZodType(zodType: ZodType): ZodType {
  if (zodType instanceof ZodOptional) {
    return (zodType as ZodOptional<any>).unwrap();
  }
  if (zodType instanceof ZodDefault) {
    return (zodType as ZodDefault<any>).unwrap();
  }
  if (zodType instanceof ZodNullable) {
    return (zodType as ZodNullable<any>).unwrap();
  }
  return zodType;
}

export function isOptionalType(zodType: ZodType): boolean {
  const isOptional =
    zodType instanceof ZodOptional ||
    zodType instanceof ZodDefault ||
    zodType instanceof ZodNullable;
  if (!isOptional) {
    const unwrapped = unwrapZodType(zodType);
    if (unwrapped !== zodType) {
      return isOptionalType(unwrapped);
    }
  }
  return isOptional;
}

export function getDefaultValue(zodType: ZodType): any {
  if (zodType instanceof ZodDefault) {
    return (zodType as ZodDefault<any>).def.defaultValue;
  }
  const unwrapped = unwrapZodType(zodType);
  if (unwrapped !== zodType) {
    return getDefaultValue(unwrapped);
  }
  return null;
}

export function fullyUnwrapZodType(zodType: ZodType): ZodType {
  const unwrappedType = unwrapZodType(zodType);
  if (unwrappedType === zodType) {
    return unwrappedType;
  }
  return fullyUnwrapZodType(unwrappedType);
}

export function getTypeDescription(zodType: ZodType): string | null {
  if (zodType.description) {
    return zodType.description;
  }
  const unwrapped = unwrapZodType(zodType);
  if (unwrapped !== zodType) {
    return getTypeDescription(unwrapped);
  }
  return null;
}

export function getReadableTypeName(zodType: ZodType): string {
  zodType = fullyUnwrapZodType(zodType);
  if (zodType instanceof ZodRecord) {
    const record = zodType as ZodRecord;
    return `record<${getReadableTypeName(record.def.keyType as ZodType)}, ${getReadableTypeName(record.def.valueType as ZodType)}>`;
  }
  if (zodType instanceof ZodString) return "string";
  if (zodType instanceof ZodNumber) return "number";
  if (zodType instanceof ZodBoolean) return "boolean";
  if (zodType instanceof ZodArray) return "array";
  if (zodType instanceof ZodObject) return "object";
  if (zodType instanceof ZodEnum) return "enum";
  if (zodType instanceof ZodLiteral) return "literal";
  if (zodType instanceof ZodUnion) return "union";
  if (zodType instanceof ZodAny) return "any";
  return "any";
}
