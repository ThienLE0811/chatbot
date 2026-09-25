import { TrainingDocuments } from './training-data.exporter';

/**
 * Sample data for a Vietnamese customer-support bot that can also make small
 * talk (its own name, age, creator; remembering the user's name), in the same document
 * shape the admin UI stores. `npm run seed:training` inserts it so an empty
 * database can be trained right away; edit or delete it from the UI after.
 *
 * Company details (hours, address, hotline) are placeholders.
 */

const NLU: Record<string, { description: string; examples: string[] }> = {
  greet: {
    description: 'Người dùng chào hỏi',
    examples: [
      'xin chào',
      'chào bạn',
      'chào shop',
      'hello',
      'hi',
      'alo',
      'chào buổi sáng',
      'chào ad',
      'có ai ở đó không',
      'xin chào, mình cần hỗ trợ',
    ],
  },
  goodbye: {
    description: 'Người dùng chào tạm biệt',
    examples: [
      'tạm biệt',
      'bye',
      'bye bye',
      'hẹn gặp lại',
      'mình đi đây',
      'thôi chào bạn nhé',
      'chào nhé',
      'hẹn lần sau',
    ],
  },
  thank: {
    description: 'Người dùng cảm ơn',
    examples: [
      'cảm ơn',
      'cảm ơn bạn',
      'cám ơn nhiều',
      'thank you',
      'thanks',
      'ok cảm ơn nhé',
      'cảm ơn bạn đã hỗ trợ',
      'tuyệt vời, cảm ơn',
    ],
  },
  affirm: {
    description: 'Người dùng đồng ý, xác nhận',
    examples: [
      'đúng rồi',
      'có',
      'ok',
      'đồng ý',
      'chính xác',
      'vâng',
      'ừ',
      'được',
      'chuẩn rồi',
      'yes',
    ],
  },
  deny: {
    description: 'Người dùng từ chối, phủ nhận',
    examples: [
      'không',
      'không phải',
      'sai rồi',
      'không đúng',
      'thôi',
      'không cần',
      'no',
      'hủy đi',
      'để sau nhé',
    ],
  },
  // Bot chào tạm biệt sớm quá, người dùng vẫn còn muốn hỏi.
  not_finished: {
    description: 'Người dùng chưa xong, muốn hỏi tiếp',
    examples: [
      'tôi chưa hỏi mà',
      'mình chưa hỏi xong',
      'mình còn chưa hỏi gì',
      'khoan đã',
      'khoan, mình còn câu hỏi',
      'chờ chút, mình muốn hỏi thêm',
      'đừng đi vội',
      'mình còn muốn hỏi nữa',
      'sao đã tạm biệt rồi',
      'ơ mình chưa nói xong',
      'từ từ đã, mình chưa hỏi',
    ],
  },
  bot_challenge: {
    description: 'Người dùng hỏi đang nói chuyện với ai',
    examples: [
      'bạn là ai',
      'bạn là bot à',
      'mình đang nói chuyện với người hay máy',
      'bạn có phải người thật không',
      'đây là chatbot hả',
      'ai đang trả lời vậy',
    ],
  },
  // Làm quen: người dùng hỏi thông tin của bot và bot nhớ tên người dùng.
  ask_bot_name: {
    description: 'Hỏi tên của bot',
    examples: [
      'bạn tên gì',
      'tên bạn là gì',
      'bạn tên là gì vậy',
      'mình nên gọi bạn là gì',
      'cho mình biết tên bạn đi',
      'bot tên gì thế',
      'tên của bạn là gì',
    ],
  },
  ask_bot_age: {
    description: 'Hỏi tuổi của bot',
    examples: [
      'bạn bao nhiêu tuổi',
      'bạn mấy tuổi rồi',
      'bạn sinh năm nào',
      'tuổi của bạn là bao nhiêu',
      'bạn ra đời khi nào',
      'bạn được bao nhiêu tuổi rồi',
    ],
  },
  ask_bot_creator: {
    description: 'Hỏi ai tạo ra bot',
    examples: [
      'ai tạo ra bạn',
      'bạn do ai làm ra',
      'ai là người phát triển bạn',
      'bạn được tạo bởi ai',
      'ai lập trình ra bạn vậy',
      'bạn thuộc về ai',
    ],
  },
  ask_bot_ability: {
    description: 'Hỏi bot làm được gì',
    examples: [
      'bạn làm được gì',
      'bạn giúp được gì cho mình',
      'bạn biết làm những gì',
      'bạn có thể làm gì',
      'chức năng của bạn là gì',
      'mình có thể hỏi bạn những gì',
    ],
  },
  ask_bot_feeling: {
    description: 'Hỏi thăm bot',
    examples: [
      'bạn khỏe không',
      'bạn có khỏe không',
      'hôm nay bạn thế nào',
      'dạo này bạn sao rồi',
      'bạn ổn chứ',
      'bạn có vui không',
    ],
  },
  ask_user_name: {
    description: 'Người dùng hỏi bot có nhớ tên mình không',
    examples: [
      'tôi tên gì',
      'mình tên là gì nhỉ',
      'bạn có nhớ tên mình không',
      'bạn biết tên tôi không',
      'tên tôi là gì',
      'bạn còn nhớ mình tên gì không',
      'nhắc lại tên mình xem',
      'bạn có biết tôi là ai không',
    ],
  },
  ask_working_hours: {
    description: 'Hỏi giờ làm việc',
    examples: [
      'mấy giờ mở cửa',
      'giờ làm việc thế nào',
      'bên bạn làm việc từ mấy giờ',
      'thứ bảy có làm không',
      'chủ nhật có mở cửa không',
      'mấy giờ thì đóng cửa',
      'lịch làm việc của công ty',
      'giờ hành chính là mấy giờ',
    ],
  },
  ask_address: {
    description: 'Hỏi địa chỉ',
    examples: [
      'địa chỉ ở đâu',
      'công ty ở đâu vậy',
      'văn phòng nằm ở đâu',
      'cho mình xin địa chỉ',
      'làm sao để đến văn phòng',
      'bên bạn có chi nhánh không',
      'trụ sở ở đâu',
    ],
  },
  ask_contact: {
    description: 'Hỏi thông tin liên hệ',
    examples: [
      'số hotline là gì',
      'cho mình xin số điện thoại',
      'email liên hệ là gì',
      'liên hệ với bên bạn thế nào',
      'mình muốn gặp nhân viên',
      'cho xin số tổng đài',
      'mình muốn nói chuyện với người thật',
    ],
  },
  ask_services: {
    description: 'Hỏi về dịch vụ, sản phẩm',
    examples: [
      'bên bạn có dịch vụ gì',
      'công ty cung cấp những gì',
      'cho mình xem danh sách dịch vụ',
      'bạn bán gì vậy',
      'có những gói dịch vụ nào',
      'bảng giá thế nào',
      'giá dịch vụ bao nhiêu',
      'mình muốn tìm hiểu sản phẩm',
    ],
  },
  complain: {
    description: 'Người dùng phàn nàn, không hài lòng',
    examples: [
      'dịch vụ tệ quá',
      'mình không hài lòng',
      'sao chậm vậy',
      'mình muốn khiếu nại',
      'bực mình quá',
      'chờ lâu quá rồi',
      'nhân viên hỗ trợ kém',
    ],
  },
  request_consultation: {
    description: 'Muốn đặt lịch tư vấn',
    examples: [
      'mình muốn được tư vấn',
      'đặt lịch tư vấn',
      'cho mình đăng ký tư vấn',
      'mình cần người tư vấn',
      'nhờ tư vấn giúp mình',
      'đăng ký nhận tư vấn',
      'có thể gọi lại tư vấn cho mình không',
      'mình muốn hẹn lịch tư vấn',
    ],
  },
  inform: {
    description: 'Người dùng cung cấp họ tên hoặc số điện thoại',
    examples: [
      'tôi tên là [Thiện](customer_name)',
      'mình tên là [Thiện](customer_name)',
      'tên mình là [Lê Văn Thiện](customer_name)',
      'mình là [Thiện](customer_name) nè',
      'cứ gọi mình là [Thiện](customer_name)',
      'tên tôi là [Thiện](customer_name)',
      'tớ tên [Linh](customer_name)',
      'mình tên là [Mai](customer_name)',
      'tôi tên là [Hoàng Anh](customer_name)',
      'tên mình là [Nguyễn Văn An](customer_name)',
      'mình tên [Trần Thị Bình](customer_name)',
      'tôi là [Lê Minh](customer_name)',
      '[Phạm Hoàng Nam](customer_name)',
      'mình là [Hoa](customer_name)',
      'tên [Đỗ Quang Huy](customer_name) nhé',
      'số của mình là [0912345678](phone_number)',
      'sđt [0987654321](phone_number)',
      '[0901234567](phone_number)',
      'gọi cho mình số [0368123456](phone_number)',
      'số điện thoại [0773456789](phone_number) nhé',
      'liên hệ qua số [0934567890](phone_number)',
    ],
  },
};

const RESPONSES: Record<string, unknown[]> = {
  utter_greet: [
    { text: 'Xin chào! Mình là trợ lý ảo, mình có thể giúp gì cho bạn?' },
    { text: 'Chào bạn! Bạn cần hỗ trợ gì hôm nay ạ?' },
  ],
  utter_goodbye: [
    { text: 'Tạm biệt bạn, hẹn gặp lại!' },
    { text: 'Chúc bạn một ngày tốt lành, hẹn gặp lại nhé!' },
  ],
  utter_continue: [
    { text: 'Dạ xin lỗi bạn, mình vẫn ở đây. Bạn cứ hỏi tiếp nhé!' },
    { text: 'Ôi mình vội quá! Bạn muốn hỏi gì cứ nhắn mình nhé.' },
  ],
  utter_you_are_welcome: [
    { text: 'Không có gì ạ, rất vui được hỗ trợ bạn!' },
    { text: 'Rất sẵn lòng! Bạn cần gì thêm cứ nhắn mình nhé.' },
  ],
  utter_iamabot: [
    {
      text: 'Mình là trợ lý ảo tự động. Nếu cần gặp nhân viên, bạn hãy hỏi thông tin liên hệ nhé.',
    },
  ],
  utter_bot_name: [
    { text: 'Mình tên là AceBot, trợ lý ảo của bạn. Còn bạn tên gì?' },
    { text: 'Bạn cứ gọi mình là AceBot nhé! Bạn tên là gì vậy?' },
  ],
  utter_bot_age: [
    {
      text: 'Mình là chatbot nên không có tuổi như con người, mình mới được tạo ra gần đây thôi.',
    },
  ],
  utter_bot_creator: [
    { text: 'Mình được đội ngũ phát triển xây dựng trên nền tảng Rasa.' },
  ],
  utter_bot_ability: [
    {
      text: 'Mình có thể trò chuyện làm quen, trả lời giờ làm việc, địa chỉ, thông tin liên hệ, giới thiệu dịch vụ và đặt lịch tư vấn cho bạn.',
    },
  ],
  utter_bot_feeling: [
    { text: 'Mình vẫn ổn, cảm ơn bạn đã hỏi thăm! Còn bạn thì sao?' },
  ],
  utter_nice_to_meet_you: [
    { text: 'Rất vui được làm quen với {customer_name}!' },
    { text: 'Chào {customer_name}, rất vui được nói chuyện với bạn!' },
  ],
  utter_tell_user_name: [{ text: 'Bạn tên là {customer_name}, mình nhớ mà!' }],
  utter_unknown_user_name: [
    { text: 'Mình chưa biết tên bạn. Bạn tên là gì vậy?' },
  ],
  utter_working_hours: [
    {
      text: 'Bên mình làm việc từ 8:00 đến 17:30, thứ Hai đến thứ Sáu, và 8:00 đến 12:00 sáng thứ Bảy.',
    },
  ],
  utter_address: [
    { text: 'Văn phòng của bên mình ở: Số 1 Đường ABC, Quận X, Hà Nội.' },
  ],
  utter_contact: [
    {
      text: 'Bạn có thể liên hệ hotline 0123 456 789 hoặc email hotro@example.com trong giờ làm việc.',
    },
  ],
  utter_services: [
    {
      text: 'Bên mình có các dịch vụ: tư vấn giải pháp, triển khai phần mềm và hỗ trợ kỹ thuật. Bạn muốn được tư vấn chi tiết không?',
      buttons: [
        { title: 'Đặt lịch tư vấn', payload: '/request_consultation' },
        { title: 'Để sau', payload: '/deny' },
      ],
    },
  ],
  utter_apologize: [
    {
      text: 'Mình rất xin lỗi vì trải nghiệm chưa tốt. Bạn vui lòng gọi hotline 0123 456 789 để được hỗ trợ ngay nhé.',
    },
  ],
  utter_ask_customer_name: [
    { text: 'Bạn cho mình xin họ tên để tiện xưng hô nhé?' },
  ],
  utter_ask_phone_number: [
    { text: 'Cảm ơn bạn. Bạn cho mình xin số điện thoại liên hệ ạ?' },
  ],
  utter_confirm_consultation: [
    {
      text: 'Mình xác nhận lại: họ tên {customer_name}, số điện thoại {phone_number}. Thông tin này đúng chưa ạ?',
      buttons: [
        { title: 'Đúng rồi', payload: '/affirm' },
        { title: 'Chưa đúng', payload: '/deny' },
      ],
    },
  ],
  utter_consultation_booked: [
    {
      text: 'Đã ghi nhận! Nhân viên tư vấn sẽ gọi lại cho bạn trong giờ làm việc.',
    },
  ],
  utter_consultation_cancelled: [
    {
      text: 'Mình đã hủy yêu cầu. Khi cần tư vấn, bạn cứ nhắn "đặt lịch tư vấn" nhé.',
    },
  ],
  /** Rasa's action_default_fallback sends this when it does not understand. */
  utter_default: [
    {
      text: 'Xin lỗi, mình chưa hiểu ý bạn. Bạn có thể nói rõ hơn được không?',
    },
  ],
};

/** Single-turn questions: the answer does not depend on earlier turns. */
const RULES: [string, string, string][] = [
  ['Chào hỏi', 'greet', 'utter_greet'],
  ['Tạm biệt', 'goodbye', 'utter_goodbye'],
  ['Người dùng muốn hỏi tiếp', 'not_finished', 'utter_continue'],
  ['Cảm ơn', 'thank', 'utter_you_are_welcome'],
  ['Hỏi bot là ai', 'bot_challenge', 'utter_iamabot'],
  ['Hỏi tên bot', 'ask_bot_name', 'utter_bot_name'],
  ['Hỏi tuổi bot', 'ask_bot_age', 'utter_bot_age'],
  ['Hỏi ai tạo ra bot', 'ask_bot_creator', 'utter_bot_creator'],
  ['Hỏi bot làm được gì', 'ask_bot_ability', 'utter_bot_ability'],
  ['Hỏi thăm bot', 'ask_bot_feeling', 'utter_bot_feeling'],
  ['Hỏi giờ làm việc', 'ask_working_hours', 'utter_working_hours'],
  ['Hỏi địa chỉ', 'ask_address', 'utter_address'],
  ['Hỏi thông tin liên hệ', 'ask_contact', 'utter_contact'],
  ['Hỏi dịch vụ', 'ask_services', 'utter_services'],
  ['Phàn nàn', 'complain', 'utter_apologize'],
];

const collectContactSteps = [
  { intent: 'request_consultation' },
  { action: 'utter_ask_customer_name' },
  { intent: 'inform', entities: [{ customer_name: 'Nguyễn Văn An' }] },
  { slot_was_set: [{ customer_name: 'Nguyễn Văn An' }] },
  { action: 'utter_ask_phone_number' },
  { intent: 'inform', entities: [{ phone_number: '0912345678' }] },
  { slot_was_set: [{ phone_number: '0912345678' }] },
  { action: 'utter_confirm_consultation' },
];

/** User tells their name; the slot lets the bot answer "tôi tên gì" later. */
const introduceSteps = [
  { intent: 'inform', entities: [{ customer_name: 'Thiện' }] },
  { slot_was_set: [{ customer_name: 'Thiện' }] },
  { action: 'utter_nice_to_meet_you' },
];

const STORIES: { story: string; steps: unknown[] }[] = [
  {
    story: 'Làm quen - chào rồi giới thiệu tên',
    steps: [{ intent: 'greet' }, { action: 'utter_greet' }, ...introduceSteps],
  },
  {
    story: 'Làm quen - hỏi tên bot rồi giới thiệu tên',
    steps: [
      { intent: 'ask_bot_name' },
      { action: 'utter_bot_name' },
      ...introduceSteps,
    ],
  },
  {
    story: 'Làm quen - hỏi lại tên sau khi giới thiệu',
    steps: [
      ...introduceSteps,
      { intent: 'ask_user_name' },
      { action: 'utter_tell_user_name' },
    ],
  },
  {
    story: 'Làm quen - hỏi tên khi bot chưa biết',
    steps: [
      { intent: 'ask_user_name' },
      { action: 'utter_unknown_user_name' },
      ...introduceSteps,
      { intent: 'ask_user_name' },
      { action: 'utter_tell_user_name' },
    ],
  },
  {
    story: 'Làm quen - trò chuyện về bot và người dùng',
    steps: [
      { intent: 'greet' },
      { action: 'utter_greet' },
      { intent: 'ask_bot_name' },
      { action: 'utter_bot_name' },
      ...introduceSteps,
      { intent: 'ask_bot_age' },
      { action: 'utter_bot_age' },
      { intent: 'ask_bot_creator' },
      { action: 'utter_bot_creator' },
      { intent: 'ask_user_name' },
      { action: 'utter_tell_user_name' },
      { intent: 'goodbye' },
      { action: 'utter_goodbye' },
    ],
  },
  {
    story: 'Đặt lịch tư vấn - xác nhận',
    steps: [
      ...collectContactSteps,
      { intent: 'affirm' },
      { action: 'utter_consultation_booked' },
    ],
  },
  {
    story: 'Đặt lịch tư vấn - hủy',
    steps: [
      ...collectContactSteps,
      { intent: 'deny' },
      { action: 'utter_consultation_cancelled' },
    ],
  },
  {
    story: 'Hỏi dịch vụ rồi đặt lịch tư vấn',
    steps: [
      { intent: 'greet' },
      { action: 'utter_greet' },
      { intent: 'ask_services' },
      { action: 'utter_services' },
      ...collectContactSteps,
      { intent: 'affirm' },
      { action: 'utter_consultation_booked' },
      { intent: 'thank' },
      { action: 'utter_you_are_welcome' },
    ],
  },
  {
    story: 'Hỏi dịch vụ nhưng chưa cần tư vấn',
    steps: [
      { intent: 'ask_services' },
      { action: 'utter_services' },
      { intent: 'deny' },
      { action: 'utter_goodbye' },
    ],
  },
];

export const TRAINING_SEED: TrainingDocuments = {
  intents: Object.entries(NLU).map(([title, { description }]) => ({
    title,
    description,
  })),
  // The examples live only here, where Rasa trains from and the intents page
  // reads and writes them.
  nlu: Object.entries(NLU).map(([intent, { examples }]) => ({
    intent,
    examples,
  })),
  entities: [
    {
      nameEntities: 'customer_name',
      description: 'Họ tên khách hàng',
      dataEntities: ['Thiện', 'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Minh'],
    },
    {
      nameEntities: 'phone_number',
      description: 'Số điện thoại khách hàng',
      dataEntities: ['0912345678', '0987654321'],
    },
  ],
  slots: [
    {
      nameSlot: 'customer_name',
      type: 'text',
      mapping: [{ type: 'from_entity', entity: 'customer_name' }],
    },
    {
      nameSlot: 'phone_number',
      type: 'text',
      mapping: [{ type: 'from_entity', entity: 'phone_number' }],
    },
  ],
  responses: Object.entries(RESPONSES).map(([title, data]) => ({
    title,
    data,
  })),
  // Only custom actions go here and they need a Rasa action server, which
  // this bot does not run; responses are already valid story actions.
  actions: [],
  rules: RULES.map(([rule, intent, action]) => ({
    rule,
    steps: [{ intent }, { action }],
  })),
  stories: STORIES,
};

/** Field that identifies a document, used to skip ones that already exist. */
export const SEED_KEYS: Record<keyof TrainingDocuments, string> = {
  intents: 'title',
  nlu: 'intent',
  entities: 'nameEntities',
  slots: 'nameSlot',
  responses: 'title',
  actions: 'action',
  rules: 'rule',
  stories: 'story',
};
