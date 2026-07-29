use tauri::{
    AppHandle, Runtime,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
    image::Image,
};

pub fn create_tray<R: Runtime>(app: &AppHandle<R>, _window: tauri::WebviewWindow<R>) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
    let hide_item = MenuItemBuilder::with_id("hide", "隐藏窗口").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&hide_item)
        .separator()
        .item(&quit_item)
        .build()?;

    // Decode PNG icon into RGBA for tray
    let png_bytes = include_bytes!("../../icons/icon.png");
    let img = image::load_from_memory(png_bytes)?.into_rgba8();
    let (w, h) = img.dimensions();
    let icon = Image::new_owned(img.into_raw(), w, h);

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("TinyCalendar")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "hide" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.hide();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}
