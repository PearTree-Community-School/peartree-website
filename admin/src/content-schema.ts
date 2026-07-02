import { z } from 'zod';

export type FieldType = 'text' | 'textarea' | 'number' | 'select';

export type FieldDef = {
  readonly name: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly options?: readonly string[];
  readonly help?: string;
};

export type CollectionKind = 'list' | 'singleton';

export type CollectionDef = {
  readonly slug: string;
  readonly label: string;
  readonly kind: CollectionKind;
  readonly description: string;
  /** Field whose value is shown as the row title in list views. */
  readonly titleField: string;
  readonly fields: readonly FieldDef[];
};

function text(name: string, label: string, required = true, help?: string): FieldDef {
  return { name, label, type: 'text', required, ...(help ? { help } : {}) };
}

function textarea(name: string, label: string, required = true, help?: string): FieldDef {
  return { name, label, type: 'textarea', required, ...(help ? { help } : {}) };
}

function number(name: string, label: string, required = true, help?: string): FieldDef {
  return { name, label, type: 'number', required, ...(help ? { help } : {}) };
}

export const collections: readonly CollectionDef[] = [
  {
    slug: 'testimonials',
    label: 'Testimonials',
    kind: 'list',
    description: 'Parent and community quotes shown on the public site.',
    titleField: 'quote',
    fields: [
      textarea('quote', 'Quote'),
      text('source', 'Source', true, 'e.g. Current Parent'),
      text('origin', 'Origin', false, 'e.g. Berkeley Parents Network'),
    ],
  },
  {
    slug: 'parent-faq',
    label: 'Parent FAQ',
    kind: 'list',
    description: 'Questions and answers on the parent portal.',
    titleField: 'question',
    fields: [text('question', 'Question'), textarea('answer', 'Answer')],
  },
  {
    slug: 'classrooms',
    label: 'Classrooms',
    kind: 'list',
    description: 'Classroom names, levels, and campuses.',
    titleField: 'name',
    fields: [
      text('name', 'Name'),
      text('level', 'Level', true, 'e.g. Kindergarten / 1st Grade'),
      {
        name: 'campus',
        label: 'Campus',
        type: 'select',
        required: true,
        options: ['preschool', 'elementary'],
      },
    ],
  },
  {
    slug: 'stats-list',
    label: 'Stats list',
    kind: 'list',
    description: 'Label/value stats shown on the public site (e.g. "Founded — 2012").',
    titleField: 'label',
    fields: [text('label', 'Label'), text('value', 'Value')],
  },
  {
    slug: 'school-stats',
    label: 'School stats',
    kind: 'singleton',
    description: 'Structured numbers used across the site.',
    titleField: 'founded',
    fields: [
      number('founded', 'Year founded'),
      number('studentsOfColor', 'Students of color (%)'),
      number('familiesReceivingAid', 'Families receiving aid (%)'),
      number('exceedLiteracyBenchmarks', 'Exceed literacy benchmarks (%)'),
      number('staffCount', 'Staff count'),
      number('preschoolMinAge', 'Preschool minimum age'),
      text('elementaryGrades', 'Elementary grades', true, 'e.g. TK–5'),
    ],
  },
  {
    slug: 'mission-statement',
    label: 'Mission statement',
    kind: 'singleton',
    description: 'Tagline, mission copy, and the Baldwin quote.',
    titleField: 'tagline',
    fields: [
      text('tagline', 'Tagline'),
      textarea('shortMission', 'Short mission'),
      textarea('fullMission', 'Full mission'),
      textarea('missionContext', 'Mission context'),
      textarea('baldwinQuote', 'Baldwin quote'),
      text('baldwinQuoteSource', 'Baldwin quote source'),
    ],
  },
];

export function findCollection(slug: string): CollectionDef | null {
  return collections.find((c) => c.slug === slug) ?? null;
}

function fieldSchema(field: FieldDef): z.ZodType<unknown> {
  switch (field.type) {
    case 'number': {
      const base = z.coerce.number().finite();
      return field.required ? base : base.optional();
    }
    case 'select': {
      const options = field.options ?? [];
      const base = z.string().refine((v) => options.includes(v), {
        message: `Must be one of: ${options.join(', ')}`,
      });
      return field.required ? base : base.optional();
    }
    default: {
      const base = z.string().trim();
      return field.required ? base.min(1, 'Required') : base.optional();
    }
  }
}

export function collectionSchema(def: CollectionDef): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodType<unknown>> = {};
  for (const field of def.fields) {
    shape[field.name] = fieldSchema(field);
  }
  return z.object(shape) as z.ZodType<Record<string, unknown>>;
}

export type ParsedFormResult =
  | { readonly ok: true; readonly data: Record<string, unknown> }
  | { readonly ok: false; readonly message: string };

/** Convert an HTML form submission into a validated content record. */
export function parseContentForm(def: CollectionDef, form: FormData): ParsedFormResult {
  const raw: Record<string, unknown> = {};
  for (const field of def.fields) {
    const value = form.get(field.name);
    const str = typeof value === 'string' ? value.trim() : '';
    if (str === '') {
      if (field.required) {
        return { ok: false, message: `${field.label} is required.` };
      }
      continue;
    }
    raw[field.name] = str;
  }
  const parsed = collectionSchema(def).safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join('.') ?? 'form';
    return { ok: false, message: `Invalid ${where}: ${first?.message ?? 'validation failed'}` };
  }
  return { ok: true, data: parsed.data };
}
