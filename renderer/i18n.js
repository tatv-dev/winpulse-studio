/* ═══════════════════════════════════════════════════════════════
   WinPulse – Localization (i18n) Dictionary
   Tiếng Việt (vi) & English (en)
═══════════════════════════════════════════════════════════════ */

const translations = {
  vi: {
    // Navigation
    nav_dashboard: "Tổng quan",
    nav_history: "Lịch sử",
    nav_settings: "Cài đặt",
    live_tracking: "Theo dõi thời gian thực",

    // Header
    dashboard_title: "Trung tâm Tổng quan Hiệu suất",
    btn_reset_today: "Đặt lại hôm nay",
    reset_confirm: "Bạn có chắc muốn đặt lại toàn bộ dữ liệu ngày hôm nay? Thao tác này không thể hoàn tác.",
    reset_success: "Đã đặt lại dữ liệu ngày hôm nay thành công",
    quit_confirm: "Thoát ứng dụng WinPulse? Tiến trình theo dõi sẽ dừng lại.",

    // Metric cards - Gọn gàng, thuần Việt, không cần mở ngoặc tiếng Anh
    metric_copy: "Sao chép",
    metric_paste: "Dán",
    metric_clicks: "Nhấp chuột",
    metric_scroll: "Cuộn trang",

    // Chart titles & legends
    chart_trend_title: "Xu hướng tương tác 7 ngày qua",
    chart_trend_badge: "7 ngày",
    chart_dist_title: "Cơ cấu thao tác hôm nay",
    chart_mouse_title: "Chi tiết nhấp chuột & cuộn trang",
    chart_ratio_title: "Tỷ lệ tương quan & Tích lũy",
    
    label_copy: "Sao chép",
    label_paste: "Dán",
    label_clicks: "Nhấp chuột",
    label_scroll: "Cuộn",
    label_left_click: "Chuột trái",
    label_right_click: "Chuột phải",
    label_middle_click: "Chuột giữa",
    label_scroll_action: "Cuộn trang",

    summary_cp_ratio: "Tỷ lệ Sao chép / Dán hôm nay",
    summary_no_cp: "Chưa có thao tác clipboard",
    summary_today_total: "Tổng thao tác hôm nay",
    summary_alltime_total: "Tổng tích lũy toàn thời gian",
    no_data: "Chưa có dữ liệu",

    // History page
    history_title: "Nhật ký hoạt động chi tiết",
    history_subtitle: "Dữ liệu tổng hợp theo từng ngày",
    th_date: "Ngày",
    th_copy: "Sao chép",
    th_paste: "Dán",
    th_left: "Chuột Trái",
    th_right: "Chuột Phải",
    th_middle: "Chuột Giữa",
    th_scroll: "Cuộn Trang",
    th_total: "Tổng cộng",
    today_badge: "Hôm nay",
    loading_data: "Đang tải dữ liệu...",
    no_history: "Chưa có dữ liệu lịch sử",

    // Settings page
    settings_title: "Cài đặt ứng dụng",
    settings_subtitle: "Quản lý tùy chọn và dữ liệu WinPulse",
    setting_lang: "Ngôn ngữ hiển thị",
    setting_lang_desc: "Chuyển đổi giữa Tiếng Việt và English",
    setting_data_path: "Thư mục lưu trữ dữ liệu",
    btn_open_folder: "Xem thư mục",
    setting_theme: "Giao diện",
    setting_theme_desc: "Chế độ sáng tiêu chuẩn (Light Mode)",
    badge_default: "Mặc định",
    setting_tray: "Khay hệ thống",
    setting_tray_desc: "Tự động thu nhỏ về khay hệ thống khi đóng cửa sổ",
    badge_enabled: "Đang bật",
    setting_quit: "Đóng ứng dụng",
    setting_quit_desc: "Dừng tiến trình giám sát và thoát hoàn toàn",
    btn_quit: "Thoát",
    about_title: "WinPulse Studio · Trung tâm Đo lường Thao tác Windows",
    about_ver: "Phiên bản 1.2.0 · Hỗ trợ Đa ngôn ngữ (VI / EN)",
    about_desc: "Công cụ đo lường và theo dõi thao tác năng suất máy tính, bảo mật và chạy cục bộ 100%."
  },
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_history: "History",
    nav_settings: "Settings",
    live_tracking: "Live Tracking Active",

    // Header
    dashboard_title: "Performance Analytics Hub",
    btn_reset_today: "Reset Today",
    reset_confirm: "Are you sure you want to reset today's metrics? This cannot be undone.",
    reset_success: "Today's metrics have been reset successfully",
    quit_confirm: "Quit WinPulse? Background tracking will stop.",

    // Metric cards
    metric_copy: "Copy",
    metric_paste: "Paste",
    metric_clicks: "Clicks",
    metric_scroll: "Scroll",

    // Chart titles & legends
    chart_trend_title: "7-Day Interaction Trends",
    chart_trend_badge: "7 Days",
    chart_dist_title: "Today's Action Breakdown",
    chart_mouse_title: "Mouse Clicks & Scroll Breakdown",
    chart_ratio_title: "Correlation Ratio & Totals",
    
    label_copy: "Copy",
    label_paste: "Paste",
    label_clicks: "Clicks",
    label_scroll: "Scroll",
    label_left_click: "Left Click",
    label_right_click: "Right Click",
    label_middle_click: "Middle Click",
    label_scroll_action: "Scroll Action",

    summary_cp_ratio: "Today's Copy / Paste Ratio",
    summary_no_cp: "No clipboard actions yet",
    summary_today_total: "Total Actions Today",
    summary_alltime_total: "All-time Cumulative Actions",
    no_data: "No data available",

    // History page
    history_title: "Detailed Activity Log",
    history_subtitle: "Aggregated metrics breakdown by date",
    th_date: "Date",
    th_copy: "Copy",
    th_paste: "Paste",
    th_left: "Left Click",
    th_right: "Right Click",
    th_middle: "Middle Click",
    th_scroll: "Scroll",
    th_total: "Total",
    today_badge: "Today",
    loading_data: "Loading data...",
    no_history: "No historical records found",

    // Settings page
    settings_title: "Application Settings",
    settings_subtitle: "Manage preferences and local data storage",
    setting_lang: "Display Language",
    setting_lang_desc: "Switch between Vietnamese and English",
    setting_data_path: "Local Data Directory",
    btn_open_folder: "Open Directory",
    setting_theme: "Theme Mode",
    setting_theme_desc: "Standard Clean Light Mode",
    badge_default: "Default",
    setting_tray: "System Tray",
    setting_tray_desc: "Automatically minimize to system tray upon window close",
    badge_enabled: "Enabled",
    setting_quit: "Exit Application",
    setting_quit_desc: "Stop all tracking services and quit the app",
    btn_quit: "Quit",
    about_title: "WinPulse Studio · Windows Productivity Suite",
    about_ver: "Version 1.2.0 · Multi-language Support (VI / EN)",
    about_desc: "Lightweight and privacy-first Windows desktop telemetry & analytics utility."
  }
};
