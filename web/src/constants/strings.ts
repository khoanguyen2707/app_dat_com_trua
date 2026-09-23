/**
 * NGUỒN DUY NHẤT cho toàn bộ chữ hiển thị (tiếng Việt) của ứng dụng.
 * Muốn đổi text ở bất cứ đâu → chỉ sửa tại file này.
 * Chuỗi có chèn biến được khai báo dưới dạng hàm: vd t.menu.confirmDelete('Cơm gà').
 */
export const t = {
  app: {
    name: 'Đặt Cơm Trưa',
    loading: 'Đang tải…',
  },

  /** Viên báo hoạt động ở đỉnh (spinner khi gọi API → ✓ khi xong) */
  activity: {
    loading: 'Đang xử lý…',
    done: 'Xong',
  },

  actions: {
    cancel: 'Huỷ',
    confirm: 'Đồng ý',
    save: 'Lưu',
    add: 'Thêm',
    delete: 'Xoá',
    saving: 'Đang lưu…',
    processing: 'Đang xử lý…',
    edit: 'Sửa',
    copy: 'Copy',
  },

  errors: {
    generic: 'Có lỗi xảy ra',
    save: 'Lỗi lưu',
    short: 'Lỗi',
    status: (code: number) => `Lỗi ${code}`,
  },

  role: {
    admin: 'Admin',
    member: 'Thành viên',
    adminIcon: '🔓',
    memberIcon: '👤',
  },

  topbar: {
    changePassword: 'Đổi mật khẩu',
    settings: 'Cài đặt',
    logout: 'Đăng xuất',
  },

  notif: {
    title: 'Thông báo',
    /** Nhãn trần (không emoji) cho nút chuông đã dùng icon SVG. */
    label: 'Thông báo',
    empty: 'Chưa có thông báo nào.',
    markAllRead: 'Đánh dấu đã đọc',
  },

  login: {
    subtitleLogin: 'Đăng nhập để đăng ký suất ăn',
    subtitleRegister: 'Tạo tài khoản mới (quyền thành viên)',
    tabLogin: 'Đăng nhập',
    tabRegister: 'Đăng ký',
    fullName: 'Họ tên',
    fullNamePlaceholder: 'Nguyễn Anh Khoa',
    email: 'Email',
    emailPlaceholder: 'ban@email.com',
    password: 'Mật khẩu',
    passwordPlaceholder: '••••••',
    submitLogin: 'Đăng nhập',
    submitRegister: 'Tạo tài khoản',
  },

  tabs: {
    order: 'Đặt cơm',
    grid: 'Bảng tuần',
    menu: 'Thực đơn',
    pay: 'Thanh toán',
    stats: 'Thống kê',
    hist: 'Lịch sử',
  },

  /** Các màn dành riêng cho thành viên (không phải admin). */
  me: {
    orderTitle: 'Đặt cơm tuần này',
    todayHeading: (day: string, date: string) => `${day}, ${date}`,
    openUntil: (cutoff: string) => `Đặt được tới ${cutoff} hôm nay`,
    closedToday: (cutoff: string) => `Đã qua ${cutoff} — hôm nay chốt rồi`,
    notInWeek: 'Hôm nay không nằm trong tuần đang mở.',
    orderedNothing: 'Hôm nay bạn chưa đặt gì.',
    orderCta: 'Đặt cơm hôm nay',
    editCta: 'Sửa suất hôm nay',
    viewCta: 'Xem chi tiết',
    restOfWeek: 'Còn lại trong tuần',
    weekTotal: 'Cả tuần',
    dayEmpty: 'Không đặt',
    drinkCount: (n: number) => `${n} đồ uống`,

    payTitle: 'Thanh toán của tôi',
    payNothing: 'Tuần này bạn chưa đặt suất nào, không có gì phải trả.',
    payAmount: 'Bạn cần chuyển',

    histTitle: 'Lịch sử của tôi',
    histEmpty: 'Chưa có tuần nào trước đó.',
    histNone: 'Tuần này bạn không đặt suất nào.',
    histMore: 'Xem thêm',
    histLoading: 'Đang tải…',
    histServings: (n: number) => `${n} suất`,
    histPay: 'Trả',
  },

  dashboard: {
    noWeekTitle: 'Chưa có tuần nào đang mở.',
    noWeekAdmin: ' Vào tab Lịch sử để tạo tuần mới.',
    noWeekMember: ' Nhờ admin tạo tuần mới nhé.',
    weekChip: 'Tuần:',
    statUnitPrice: 'Đơn giá / suất',
    statTotalServings: 'Tổng số suất',
    statTotalMoney: 'Tổng tiền',
    statEating: 'Đang ăn',
  },

  grid: {
    title: 'Bảng đăng ký tuần',
    // hướng dẫn chi tiết cho nghiệp vụ mới (mix món + đồ uống + chỉ đặt hôm nay)
    guide: {
      title: 'Cách đặt cơm',
      order: (price: string) => `Chạm ô để đặt cơm (${price}/ngày) — bắt buộc chọn ít nhất 1 món.`,
      detail: (where: string) =>
        `Chạm ${where} để mở phiếu chi tiết — chọn món (mix nhiều món vẫn 1 suất) & thêm đồ uống (tính tiền riêng theo giá).`,
      whereMobile: 'tên thành viên',
      whereDesktop: 'ô',
      today: (cutoff: string) => `Chỉ đặt cho HÔM NAY, trước ${cutoff} — không đặt trước cho ngày sau.`,
      cancel: 'Nút × (mobile: nút tick) dọn ô: có cơm → bỏ cơm, giữ nước (ô xanh); ô chỉ nước → bỏ nước.',
      colors: 'Ô cam = có cơm · ô xanh = chỉ uống nước.',
      admin: 'Admin: đặt/sửa hộ mọi người, mọi ngày (kể cả ngày đã khoá).',
      member: 'Bạn chỉ sửa được dòng của mình.',
    },
    locked: 'Đã khoá',
    todayTag: 'Hôm nay',
    colMember: 'Thành viên',
    colServings: 'Số suất',
    colMoney: 'Thành tiền',
    totalRow: 'TỔNG CỘNG',
    autoSave: 'Tự động lưu khi tích',
    clearRice: 'Bỏ cơm',
    clearDrink: 'Bỏ nước',
    exportBtn: 'Xuất Excel',
    exported: 'Đã xuất Excel (CSV)',
    csv: { no: 'STT', name: 'Tên', total: 'TỔNG' },
    // mobile: chọn ngày → list thành viên
    pickDay: 'Chọn ngày',
    dayTotal: (n: number) => `${n} suất`,
    noEatersDay: 'Chưa ai đăng ký ngày này.',
    eatingDay: (n: number) => `${n} người ăn`,
    // phiếu chi tiết 1 ngày (mix món + đồ uống)
    detail: {
      eat: 'Ăn cơm',
      eatPrice: (price: string) => `1 suất • ${price}`,
      foodSection: 'Món ăn (mix nhiều món vẫn 1 suất)',
      foodEnableHint: 'Bật "Ăn cơm" để chọn món.',
      needFood: 'Chọn ít nhất 1 món để đặt cơm.',
      drinkSection: 'Đồ uống (tính tiền riêng)',
      riceLabel: 'Cơm',
      drinkLabel: 'Nước',
      totalLabel: 'Tổng',
      lockedView: 'Ngày này đã khoá — chỉ xem, không sửa.',
      noFood: 'Chưa chọn món.',
      noDrink: 'Chưa có đồ uống.',
      todayMenuOnly: 'Chỉ hiện món có trong thực đơn ngày này.',
    },
  },

  menu: {
    title: 'Thực đơn',
    addBtn: 'Thêm món',
    emptyIcon: '🍽️',
    empty: 'Chưa có món nào.',
    emptyHintAdmin: ' Bấm Thêm món.',
    confirmDeleteTitle: 'Xoá món',
    confirmDelete: (name: string) => `Xoá món "${name}" khỏi thực đơn?`,
    deleted: 'Đã xoá món',
    modalEdit: 'Sửa món',
    modalCreate: 'Thêm món',
    fieldEmoji: 'Biểu tượng',
    fieldName: 'Tên món',
    namePlaceholder: 'VD: Cơm gà',
    fieldDesc: 'Mô tả',
    descPlaceholder: 'Ngắn gọn',
    fieldPrice: 'Giá (đ)',
    fieldCategory: 'Loại',
    catMain: 'Món ăn',
    catDrink: 'Đồ uống',
    foodSection: 'Món ăn',
    drinkSection: 'Đồ uống',
    searchPlaceholder: 'Tìm món…',
    searchEmpty: (q: string) => `Không có món nào khớp “${q}”.`,
    sectionCount: (n: number) => `${n} món`,
    nameRequired: 'Nhập tên món',
    saved: 'Đã lưu món',
    added: 'Đã thêm món',
    // Đăng thực đơn theo ngày: admin dán text → phân tích → áp dụng
    post: {
      btn: 'Đăng thực đơn',
      title: 'Đăng thực đơn theo ngày',
      intro: 'Dán thực đơn hôm nay → hệ thống tự nhận diện món (kể cả thiếu dấu/viết tắt), tạo món mới và ẩn món không bán hôm nay.',
      dayLabel: 'Ngày bán',
      textLabel: 'Nội dung thực đơn (mỗi món một dòng)',
      placeholder: 'VD:\nCá kho\nGà chiên mắm\nThịt kho trứng cút\n🌼 Nước đậu 10k ly\n- cà phê sữa 12k ly',
      analyzeBtn: 'Phân tích',
      analyzing: 'Đang phân tích…',
      editText: 'Sửa nội dung',
      emptyText: 'Dán nội dung thực đơn trước đã.',
      groupCreate: (n: number) => `Tạo mới (${n})`,
      groupMatched: (n: number) => `Đã có → bán hôm nay (${n})`,
      groupHidden: (n: number) => `Ẩn hôm nay (${n})`,
      groupCreateHint: 'Bỏ tick nếu không muốn tạo. Sửa loại/giá nếu cần.',
      groupHiddenHint: 'Món trong danh mục nhưng không có hôm nay — sẽ bị ẩn khỏi picker ngày này (không xoá).',
      nearWarn: (name: string, pct: number) => `Gần giống "${name}" (${pct}%) — kiểm tra kẻo trùng`,
      catMain: 'Ăn',
      catDrink: 'Uống',
      applyBtn: 'Áp dụng',
      applying: 'Đang áp dụng…',
      applied: (n: number) => `Đã đăng thực đơn — ${n} món bán hôm nay`,
      notifyLabel: 'Báo lên Teams sau khi áp dụng',
      notifyHint: 'Gửi thực đơn vừa đăng sang Power Automate để đăng vào nhóm Teams.',
      notifySent: 'Đã gửi thông báo Teams',
      notifyFailed: (err: string) => `Đã lưu thực đơn nhưng KHÔNG gửi được Teams: ${err}`,
      nothing: 'Thực đơn hôm nay đang trống.',
      summary: (create: number, sell: number, hide: number) => `Tạo ${create} • bán ${sell} • ẩn ${hide}`,
    },
  },

  payment: {
    title: 'Thanh toán',
    accountHolder: 'Chủ tài khoản',
    bank: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    copied: 'Đã copy số tài khoản',
    membersTitle: 'Công nợ tuần này',
    outstanding: 'Còn lại',
    filterAll: 'Tất cả',
    filterDue: 'Chưa trả',
    filterPending: 'Chờ xác nhận',
    filterEmpty: 'Không có ai trong mục này.',
    confirmShort: 'Xác nhận',
    undoShort: 'Hoàn tác',
    memberHintLead: 'Chạm tên để mở QR ',
    memberHintBold: 'đã điền sẵn số tiền',
    memberHintTail: ' của từng người.',
    noEaters: 'Chưa có ai đăng ký ăn.',
    servingsAmount: (servings: number, money: string) => `${servings} suất • ${money}`,
    servings: (n: number) => `${n} suất`,
    qrInfoWeek: (label: string) => `Com trua ${label}`,
    qrInfoMember: (name: string, week: string) => `${name} - ${week}`,
    modalTitle: (name: string) => `Thanh toán · ${name}`,
    amountToTransfer: 'Số tiền cần chuyển',
    servingsTimesPrice: (servings: number, price: string) => `${servings} suất × ${price}`,
    // breakdown minh bạch cơm + nước
    breakdownRice: (servings: number) => `Cơm (${servings} suất)`,
    breakdownDrink: 'Đồ uống',
    breakdownTotal: 'Tổng cộng',
    includesDrinks: (money: string) => `gồm nước ${money}`,
    drinkDetail: (name: string, qty: number) => `${name} ×${qty}`,
    transferNote: 'Nội dung CK',
    // trạng thái công nợ + luồng báo/xác nhận
    status: { UNPAID: 'Chưa trả', PENDING: 'Chờ xác nhận', PAID: 'Đã thanh toán' },
    reportBtn: 'Tôi đã chuyển khoản',
    reportCancel: 'Huỷ báo',
    reportWaiting: 'Đã gửi — chờ admin xác nhận',
    paidDone: 'Đã thanh toán — cảm ơn bạn!',
    confirmBtn: 'Xác nhận đã nhận',
    rejectBtn: 'Chưa nhận',
    reportedToast: 'Đã báo chuyển khoản, chờ admin xác nhận',
    reportCancelledToast: 'Đã huỷ báo',
    confirmedToast: 'Đã xác nhận thanh toán',
    rejectedToast: 'Đã chuyển về "Chưa trả"',
    reportedAt: (time: string) => `Báo lúc ${time}`,
    paidAt: (time: string) => `Xác nhận lúc ${time}`,
    pendingTab: (n: number) => `${n} người chờ xác nhận`,
    unmark: 'Bỏ đánh dấu',
    markPaid: 'Đã thanh toán',
    unmarked: 'Đã bỏ đánh dấu',
    marked: 'Đã đánh dấu thanh toán',
    editTitle: 'Thông tin thanh toán',
    groupName: 'Tên nhóm',
    accountHolderNoAccent: 'Chủ tài khoản (không dấu)',
    updated: 'Đã cập nhật thanh toán',
  },

  stats: {
    byMember: 'Suất theo thành viên',
    noData: 'Chưa có dữ liệu',
    byDay: 'Suất theo ngày',
    trend: 'Xu hướng các tuần',
  },

  history: {
    title: 'Lịch sử các tuần',
    newBtn: 'Tuần mới',
    empty: 'Chưa có tuần nào.',
    active: 'Đang mở',
    meta: (servings: number, total: string, members: number, unitPrice: string) =>
      `${servings} suất • ${total} • ${members} người • ${unitPrice}/suất`,
    confirmDeleteTitle: 'Xoá tuần',
    confirmDelete: (label: string) => `Xoá tuần "${label}"?\n\nMọi đăng ký cơm, đồ uống và trạng thái thanh toán của tuần này sẽ mất.`,
    deleted: 'Đã xoá tuần',
    viewBtn: 'Xem',
    viewOnlyNote: 'Tuần đã đóng — chỉ xem, không sửa.',
    hint: '"Tuần mới" tạo một tuần trống và đặt làm tuần hiện hành (giữ nguyên thành viên). Tuần cũ vẫn lưu ở đây.',
    modalTitle: 'Tạo tuần mới',
    fieldStartDate: 'Ngày bắt đầu (Thứ 2)',
    startDateHint: 'Dùng để khoá tick theo ngày & giờ chốt 10:21.',
    fieldLabel: 'Nhãn tuần',
    labelPlaceholder: 'VD: 22/6/2026 - 27/6/2026',
    fieldUnitPrice: 'Đơn giá / suất (đ)',
    labelRequired: 'Nhập nhãn tuần',
    created: 'Đã tạo tuần mới',
    createBtn: 'Tạo & kích hoạt',
  },

  settings: {
    title: 'Cài đặt (Admin)',
    tabWeek: 'Tuần',
    tabMembers: 'Thành viên',
    currentWeek: 'Tuần hiện hành',
    fieldLabel: 'Nhãn tuần',
    fieldUnitPrice: 'Đơn giá / suất (đ)',
    saveWeek: 'Lưu tuần',
    savedWeek: 'Đã lưu tuần',
    members: (n: number) => `Thành viên (${n})`,
    locked: '(khoá)',
    changeRole: 'Đổi quyền',
    lock: 'Khoá',
    unlock: 'Mở khoá',
    confirmRemove: (name: string) => `Xoá thành viên "${name}"?`,
    removed: 'Đã xoá',
    roleChanged: (name: string, role: string) => `${name} → ${role}`,
  },

  /** Quản lý thành viên trong Cài đặt (admin) */
  member: {
    searchPlaceholder: 'Tìm theo tên hoặc email…',
    summary: (total: number) => `${total} thành viên`,
    sumLocked: (n: number) => `${n} đang khoá`,
    sumNoTeams: (n: number) => `${n} chưa nối Teams`,
    sumOptOut: (n: number) => `${n} miễn lấy cơm`,
    none: 'Không có thành viên nào khớp.',
    expand: 'Xem / sửa chi tiết',
    collapse: 'Thu gọn',

    badgeLocked: 'Khoá',
    badgeOptOut: 'Miễn lấy cơm',
    badgeNoTeams: 'Chưa nối Teams',
    badgeYou: 'Bạn',
    badgeLastAdmin: 'Admin duy nhất',
    /** Hiện thay cho mô tả công tắc khi người này là admin đang hoạt động cuối cùng. */
    lastAdminHint: 'Admin duy nhất đang hoạt động — cấp quyền cho người khác trước đã',

    fieldFullName: 'Họ tên',
    fieldTeamsEmail: 'Email Teams (Microsoft 365)',
    teamsPlaceholder: 'ten.ban@congty.com',
    teamsHint: 'Dùng để @mention đúng người trong Teams khi tới lượt đi lấy cơm. Bỏ trống → Power Automate phải dùng email đăng nhập app, thường KHÔNG mention được.',
    fieldColor: 'Màu đại diện',

    optRole: 'Quyền quản trị',
    optRoleOn: 'Admin — sửa được tuần, thực đơn, thành viên',
    optRoleOff: 'Thành viên — chỉ đặt cơm cho mình',
    optActive: 'Tài khoản hoạt động',
    optActiveOn: 'Đăng nhập được, hiện trong bảng tuần',
    optActiveOff: 'Bị khoá: không đăng nhập, ẩn khỏi bảng tuần',
    optOptOut: 'Miễn đi lấy cơm',
    optOptOutOn: 'Không bao giờ bị bốc trong xoay tua',
    optOptOutOff: 'Vẫn tham gia xoay tua như mọi người',

    statsTitle: 'Xoay tua lấy cơm',
    statOrders: 'Đã đặt',
    statPickups: 'Đã đi',
    statRate: 'Tỷ lệ',
    statLast: 'Lần cuối',
    statNever: 'Chưa đi',
    statDays: (n: number) => `${n} ngày`,
    statTimes: (n: number) => `${n} lượt`,
    statsEmpty: 'Chưa có dữ liệu đặt cơm.',
    statsOptOut: 'Đang miễn đi lấy cơm — không nằm trong xoay tua.',
    queueRank: (n: number) => `#${n} sắp tới lượt`,
    queueHint: 'Thứ tự ưu tiên hiện tại (tỷ lệ càng thấp càng sớm tới lượt).',

    /* --- đổi quyền quản trị: luôn hỏi lại vì đây là thao tác dễ bấm nhầm nhất --- */
    confirmRoleTitle: 'Đổi quyền quản trị',
    confirmGrant: (name: string) =>
      `Cấp quyền admin cho "${name}"?

Người này sẽ sửa được tuần, đơn giá, thực đơn và quản lý được toàn bộ thành viên — kể cả tài khoản của bạn.`,
    confirmRevoke: (name: string) =>
      `Bỏ quyền admin của "${name}"?

Sau thao tác này họ chỉ còn đặt cơm cho chính mình.`,
    confirmRevokeSelf: `⚠️ Bỏ quyền admin của CHÍNH BẠN?

Bạn sẽ không mở được Cài đặt nữa và KHÔNG tự cấp lại quyền cho mình được — phải nhờ một admin khác. Nếu bạn đang là admin duy nhất thì sẽ không còn ai quản trị được app.`,
    grantBtn: 'Cấp quyền admin',
    revokeBtn: 'Bỏ quyền admin',
    roleGranted: (name: string) => `${name} giờ là admin`,
    roleRevoked: (name: string) => `${name} giờ là thành viên`,

    /* --- khoá tài khoản --- */
    confirmLockTitle: 'Khoá tài khoản',
    confirmLock: (name: string) =>
      `Khoá tài khoản của "${name}"?

Họ sẽ không đăng nhập được và bị ẩn khỏi bảng tuần.`,
    confirmLockSelf: `⚠️ Khoá tài khoản CỦA CHÍNH BẠN?

Bạn sẽ không đăng nhập lại được và phải nhờ một admin khác mở khoá. Nếu bạn đang là admin duy nhất thì sẽ không còn ai mở khoá được.`,
    lockBtn: 'Khoá tài khoản',
    lockedToast: (name: string) => `Đã khoá ${name}`,
    unlockedToast: (name: string) => `Đã mở khoá ${name}`,

    /* --- miễn đi lấy cơm --- */
    optOutOnToast: (name: string) => `${name} được miễn đi lấy cơm`,
    optOutOffToast: (name: string) => `${name} trở lại xoay tua lấy cơm`,

    saved: 'Đã lưu thành viên',
    nameRequired: 'Họ tên không được để trống',
    cannotDeleteSelf: 'Không thể tự xoá tài khoản đang đăng nhập',
    confirmDeleteTitle: 'Xoá thành viên',
    deleteBtn: 'Xoá hẳn',
    confirmDelete: (name: string) =>
      `Xoá hẳn "${name}"?

Toàn bộ lịch sử đặt cơm, đồ uống, thông báo và lượt đi lấy cơm của người này sẽ bị xoá theo — tổng suất/tổng tiền các tuần cũ sẽ thay đổi.

Muốn giữ lịch sử thì bấm Huỷ rồi tắt "Tài khoản hoạt động" thay vì xoá.`,
  },

  password: {
    title: 'Đổi mật khẩu',
    current: 'Mật khẩu hiện tại',
    new: 'Mật khẩu mới',
    tooShort: (min: number) => `Mật khẩu mới tối thiểu ${min} ký tự`,
    changed: 'Đổi mật khẩu thành công',
    submit: 'Đổi mật khẩu',
  },
} as const;
