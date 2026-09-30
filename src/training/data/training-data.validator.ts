import { Injectable } from '@nestjs/common';
import { ConversationDefinition, TrainingDataset } from './training-data.types';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** Where the problem is, e.g. "nlu.greet" or "stories.happy path.steps[2]". */
  path: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const SLOT_TYPES = ['text', 'bool', 'categorical', 'float', 'list', 'any'];
const SLOT_MAPPING_TYPES = [
  'from_entity',
  'from_text',
  'from_intent',
  'from_trigger_intent',
  'custom',
];
const RESPONSE_KEYS = [
  'text',
  'image',
  'buttons',
  'custom',
  'attachment',
  'elements',
  'quick_replies',
];
const STEP_KEYS = [
  'intent',
  'action',
  'bot',
  'user',
  'entities',
  'slot_was_set',
  'active_loop',
  'checkpoint',
  'or',
];
const DEFAULT_ACTIONS = [
  'action_listen',
  'action_restart',
  'action_session_start',
  'action_default_fallback',
  'action_deactivate_loop',
  'action_revert_fallback_events',
  'action_default_ask_affirmation',
  'action_default_ask_rephrase',
  'action_two_stage_fallback',
  'action_unlikely_intent',
  'action_back',
  'action_extract_slots',
];
/** Rasa's DIET classifier refuses to train on fewer intent classes. */
const MIN_INTENTS = 2;
const MIN_RECOMMENDED_EXAMPLES = 2;
/** Matches `[text](entity)`, `[text](entity:value)` and `[text]{"entity": "x"}`. */
const ENTITY_ANNOTATION =
  /\[[^\]]+\](?:\(([^):]+)(?::[^)]*)?\)|\{[^}]*"entity"\s*:\s*"([^"]+)"[^}]*\})/g;

/**
 * Checks bot data before it is sent to Rasa. Errors are problems that make
 * Rasa reject the data or produce a bot that cannot work (a story pointing at
 * a response that does not exist); they block training. Warnings are quality
 * problems and do not.
 */
@Injectable()
export class TrainingDataValidator {
  validate(dataset: TrainingDataset): ValidationReport {
    const issues = new IssueCollector();
    const intents = new Set(dataset.intents);
    const entities = new Set(dataset.entities);
    const slots = new Set(dataset.slots.map((slot) => slot.name));
    const actions = new Set([
      ...DEFAULT_ACTIONS,
      ...dataset.actions,
      ...dataset.responses.map((response) => response.name),
    ]);

    this.checkNames('intents', dataset.intents, issues);
    this.checkNames('entities', dataset.entities, issues);
    this.checkNlu(dataset, intents, entities, issues);
    this.checkResponses(dataset, issues);
    this.checkSlots(dataset, entities, intents, issues);

    const context = { intents, entities, slots, actions };
    this.checkConversations('stories', dataset.stories, context, issues);
    this.checkConversations('rules', dataset.rules, context, issues);

    return issues.report();
  }

  private checkNames(
    kind: 'intents' | 'entities',
    names: string[],
    issues: IssueCollector,
  ) {
    names.forEach((name, index) => {
      if (!name) {
        issues.error('EMPTY_NAME', `${kind}[${index}]`, 'Tên đang để trống');
      }
    });
  }

  private checkNlu(
    dataset: TrainingDataset,
    intents: Set<string>,
    entities: Set<string>,
    issues: IssueCollector,
  ) {
    const exampleOwner = new Map<string, string>();
    const trainable = new Set<string>();

    for (const item of dataset.nlu) {
      const path = `nlu.${item.intent || '(trống)'}`;
      if (!item.intent) {
        issues.error('NLU_EMPTY_INTENT', path, 'Dữ liệu NLU chưa gắn ý định');
        continue;
      }
      if (!intents.has(item.intent)) {
        issues.warning(
          'NLU_INTENT_NOT_IN_DOMAIN',
          path,
          `Ý định "${item.intent}" có dữ liệu NLU nhưng chưa được khai báo trong danh sách ý định`,
        );
      }

      const examples = item.examples.filter(Boolean);
      if (examples.length < item.examples.length) {
        issues.warning(
          'NLU_BLANK_EXAMPLE',
          path,
          `Có ${
            item.examples.length - examples.length
          } câu mẫu rỗng, sẽ bị bỏ qua`,
        );
      }
      if (examples.length === 0) {
        issues.error(
          'NLU_NO_EXAMPLES',
          path,
          `Ý định "${item.intent}" chưa có câu mẫu nào`,
        );
        continue;
      }
      trainable.add(item.intent);
      if (examples.length < MIN_RECOMMENDED_EXAMPLES) {
        issues.warning(
          'NLU_FEW_EXAMPLES',
          path,
          `Ý định "${item.intent}" chỉ có ${examples.length} câu mẫu, nên có ít nhất ${MIN_RECOMMENDED_EXAMPLES}`,
        );
      }

      for (const example of examples) {
        const key = normalizeExample(example);
        const owner = exampleOwner.get(key);
        if (owner === item.intent) {
          issues.warning(
            'NLU_DUPLICATE_EXAMPLE',
            path,
            `Câu mẫu "${example}" bị lặp lại`,
          );
        } else if (owner) {
          issues.warning(
            'NLU_EXAMPLE_IN_MULTIPLE_INTENTS',
            path,
            `Câu mẫu "${example}" xuất hiện ở cả "${owner}" và "${item.intent}", mô hình sẽ dễ nhầm`,
          );
        } else {
          exampleOwner.set(key, item.intent);
        }

        for (const entity of annotatedEntities(example)) {
          if (!entities.has(entity)) {
            issues.warning(
              'NLU_UNKNOWN_ENTITY',
              path,
              `Câu mẫu "${example}" gắn thực thể "${entity}" chưa được khai báo`,
            );
          }
        }
      }
    }

    if (trainable.size < MIN_INTENTS) {
      issues.error(
        'NLU_TOO_FEW_INTENTS',
        'nlu',
        `Cần ít nhất ${MIN_INTENTS} ý định có câu mẫu để train, hiện có ${trainable.size}`,
      );
    }

    for (const intent of intents) {
      if (intent && !trainable.has(intent)) {
        issues.warning(
          'INTENT_WITHOUT_EXAMPLES',
          `intents.${intent}`,
          `Ý định "${intent}" chưa có câu mẫu NLU nên bot sẽ không nhận ra được`,
        );
      }
    }
  }

  private checkResponses(dataset: TrainingDataset, issues: IssueCollector) {
    for (const response of dataset.responses) {
      const path = `responses.${response.name || '(trống)'}`;
      if (!response.name) {
        issues.error('EMPTY_NAME', path, 'Tên phản hồi đang để trống');
        continue;
      }
      if (!response.name.startsWith('utter_')) {
        issues.warning(
          'RESPONSE_NAME_PREFIX',
          path,
          `Tên phản hồi "${response.name}" nên bắt đầu bằng "utter_"`,
        );
      }
      if (response.variants.length === 0) {
        issues.error(
          'RESPONSE_EMPTY',
          path,
          `Phản hồi "${response.name}" chưa có nội dung`,
        );
        continue;
      }
      response.variants.forEach((variant, index) => {
        if (!isValidResponseVariant(variant)) {
          issues.error(
            'RESPONSE_INVALID_VARIANT',
            `${path}[${index}]`,
            `Phản hồi "${response.name}" có nội dung thứ ${
              index + 1
            } rỗng hoặc sai định dạng`,
          );
        }
      });
    }
  }

  private checkSlots(
    dataset: TrainingDataset,
    entities: Set<string>,
    intents: Set<string>,
    issues: IssueCollector,
  ) {
    for (const slot of dataset.slots) {
      const path = `slots.${slot.name || '(trống)'}`;
      if (!slot.name) {
        issues.error('EMPTY_NAME', path, 'Tên slot đang để trống');
        continue;
      }
      if (!SLOT_TYPES.includes(slot.type)) {
        issues.error(
          'SLOT_INVALID_TYPE',
          path,
          `Slot "${slot.name}" có kiểu "${
            slot.type
          }" không hợp lệ, chỉ nhận: ${SLOT_TYPES.join(', ')}`,
        );
      } else if (slot.type === 'categorical') {
        issues.warning(
          'SLOT_CATEGORICAL_NO_VALUES',
          path,
          `Slot "${slot.name}" kiểu categorical chưa có danh sách giá trị nên không ảnh hưởng tới hội thoại`,
        );
      }
      if (slot.mappings.length === 0) {
        issues.warning(
          'SLOT_NO_MAPPINGS',
          path,
          `Slot "${slot.name}" chưa có mapping nên sẽ không bao giờ được điền`,
        );
      }
      slot.mappings.forEach((mapping, index) => {
        const mappingPath = `${path}.mappings[${index}]`;
        if (!SLOT_MAPPING_TYPES.includes(mapping.type)) {
          issues.error(
            'SLOT_INVALID_MAPPING',
            mappingPath,
            `Slot "${slot.name}" có mapping kiểu "${
              mapping.type ?? ''
            }" không hợp lệ`,
          );
          return;
        }
        if (mapping.type === 'from_entity') {
          if (!mapping.entity) {
            issues.error(
              'SLOT_MAPPING_NO_ENTITY',
              mappingPath,
              `Slot "${slot.name}" lấy giá trị từ thực thể nhưng chưa chọn thực thể`,
            );
          } else if (!entities.has(mapping.entity)) {
            issues.error(
              'SLOT_MAPPING_UNKNOWN_ENTITY',
              mappingPath,
              `Slot "${slot.name}" dùng thực thể "${mapping.entity}" chưa được khai báo`,
            );
          }
        }
        if (
          mapping.type === 'from_intent' ||
          mapping.type === 'from_trigger_intent'
        ) {
          if (mapping.value === undefined) {
            issues.error(
              'SLOT_MAPPING_NO_VALUE',
              mappingPath,
              `Slot "${slot.name}" dùng mapping ${mapping.type} nhưng thiếu "value"`,
            );
          }
          for (const intent of toList(mapping.intent)) {
            if (!intents.has(intent)) {
              issues.error(
                'SLOT_MAPPING_UNKNOWN_INTENT',
                mappingPath,
                `Slot "${slot.name}" tham chiếu ý định "${intent}" chưa được khai báo`,
              );
            }
          }
        }
      });
    }
  }

  private checkConversations(
    kind: 'stories' | 'rules',
    conversations: ConversationDefinition[],
    context: ReferenceContext,
    issues: IssueCollector,
  ) {
    const label = kind === 'stories' ? 'Story' : 'Rule';
    const seen = new Set<string>();

    conversations.forEach((conversation, index) => {
      const path = `${kind}.${conversation.name || `[${index}]`}`;
      if (!conversation.name) {
        issues.error(
          'EMPTY_NAME',
          path,
          `${label} thứ ${index + 1} chưa có tên`,
        );
      } else if (seen.has(conversation.name)) {
        issues.error(
          'DUPLICATE_NAME',
          path,
          `${label} "${conversation.name}" bị trùng tên`,
        );
      }
      seen.add(conversation.name);

      if (conversation.steps.length === 0) {
        issues.error(
          'CONVERSATION_NO_STEPS',
          path,
          `${label} "${conversation.name}" chưa có bước nào`,
        );
        return;
      }
      conversation.steps.forEach((step, stepIndex) =>
        this.checkStep(
          step,
          `${path}.steps[${stepIndex}]`,
          `${label} "${conversation.name}" bước ${stepIndex + 1}`,
          context,
          issues,
        ),
      );
    });
  }

  private checkStep(
    step: unknown,
    path: string,
    where: string,
    context: ReferenceContext,
    issues: IssueCollector,
  ) {
    if (!isPlainObject(step)) {
      issues.error('STEP_INVALID', path, `${where} sai định dạng`);
      return;
    }
    const keys = Object.keys(step).filter((key) => STEP_KEYS.includes(key));
    if (keys.length === 0) {
      issues.error(
        'STEP_INVALID',
        path,
        `${where} không có intent, action hay slot_was_set`,
      );
      return;
    }

    if ('intent' in step) {
      this.checkIntentRef(step.intent, path, where, context, issues);
    }
    if ('or' in step) {
      const options = Array.isArray(step.or) ? step.or : [];
      if (options.length === 0) {
        issues.error('STEP_INVALID', path, `${where} có "or" rỗng`);
      }
      for (const option of options) {
        if (isPlainObject(option) && 'intent' in option) {
          this.checkIntentRef(option.intent, path, where, context, issues);
        }
      }
    }
    if ('action' in step) {
      const action = typeof step.action === 'string' ? step.action.trim() : '';
      if (!action) {
        issues.error('STEP_EMPTY_ACTION', path, `${where} chưa chọn hành động`);
      } else if (!context.actions.has(action)) {
        issues.error(
          'STEP_UNKNOWN_ACTION',
          path,
          `${where} dùng hành động "${action}" không tồn tại (chưa có phản hồi hoặc action tương ứng)`,
        );
      }
    }
    if ('slot_was_set' in step) {
      for (const slot of slotNames(step.slot_was_set)) {
        if (!context.slots.has(slot)) {
          issues.error(
            'STEP_UNKNOWN_SLOT',
            path,
            `${where} dùng slot "${slot}" chưa được khai báo`,
          );
        }
      }
    }
    if ('entities' in step) {
      for (const entity of slotNames(step.entities)) {
        if (!context.entities.has(entity)) {
          issues.warning(
            'STEP_UNKNOWN_ENTITY',
            path,
            `${where} dùng thực thể "${entity}" chưa được khai báo`,
          );
        }
      }
    }
  }

  private checkIntentRef(
    value: unknown,
    path: string,
    where: string,
    context: ReferenceContext,
    issues: IssueCollector,
  ) {
    const intent = typeof value === 'string' ? value.trim() : '';
    if (!intent) {
      issues.error('STEP_EMPTY_INTENT', path, `${where} chưa chọn ý định`);
    } else if (!context.intents.has(intent)) {
      issues.error(
        'STEP_UNKNOWN_INTENT',
        path,
        `${where} dùng ý định "${intent}" chưa được khai báo`,
      );
    }
  }
}

interface ReferenceContext {
  intents: Set<string>;
  entities: Set<string>;
  slots: Set<string>;
  actions: Set<string>;
}

class IssueCollector {
  private readonly errors: ValidationIssue[] = [];
  private readonly warnings: ValidationIssue[] = [];

  error(code: string, path: string, message: string) {
    this.errors.push({ severity: 'error', code, path, message });
  }

  warning(code: string, path: string, message: string) {
    this.warnings.push({ severity: 'warning', code, path, message });
  }

  report(): ValidationReport {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidResponseVariant(variant: unknown): boolean {
  if (!isPlainObject(variant)) return false;
  return RESPONSE_KEYS.some((key) => {
    const value = variant[key];
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

function normalizeExample(example: string): string {
  return example.toLowerCase().replace(/\s+/g, ' ').trim();
}

function annotatedEntities(example: string): string[] {
  return [...example.matchAll(ENTITY_ANNOTATION)]
    .map((match) => (match[1] ?? match[2] ?? '').trim())
    .filter(Boolean);
}

/** Names from `slot_was_set` / `entities`, which accept `[name]` or `[{name: value}]`. */
function slotNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (isPlainObject(item)) return Object.keys(item);
    return [];
  });
}

function toList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}
