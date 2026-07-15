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
    return (zodType as ZodOptional<ZodType>).unwrap();
  }
  if (zodType instanceof ZodDefault) {
    return (zodType as ZodDefault<ZodType>).unwrap();
  }
  if (zodType instanceof ZodNullable) {
    return (zodType as ZodNullable<ZodType>).unwrap();
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

export function getDefaultValue(zodType: ZodType): unknown {
  if (zodType instanceof ZodDefault) {
    return (zodType as ZodDefault<ZodType>).def.defaultValue;
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
  const unwrapped = fullyUnwrapZodType(zodType);
  if (unwrapped instanceof ZodRecord) {
    const record = unwrapped as ZodRecord;
    return `record<${getReadableTypeName(record.def.keyType as ZodType)}, ${getReadableTypeName(record.def.valueType as ZodType)}>`;
  }
  if (unwrapped instanceof ZodString) {
    return "string";
  }
  if (unwrapped instanceof ZodNumber) {
    return "number";
  }
  if (unwrapped instanceof ZodBoolean) {
    return "boolean";
  }
  if (unwrapped instanceof ZodArray) {
    return "array";
  }
  if (unwrapped instanceof ZodObject) {
    return "object";
  }
  if (unwrapped instanceof ZodEnum) {
    return "enum";
  }
  if (unwrapped instanceof ZodLiteral) {
    return "literal";
  }
  if (unwrapped instanceof ZodUnion) {
    return "union";
  }
  if (unwrapped instanceof ZodAny) {
    return "any";
  }
  return "any";
}
