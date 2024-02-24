export interface Settings {
    mode: "systemd" | "flatpak";
    // Mode: systemd
    service_name: string;
    // Mode: flatpak
    flatpak_name: string;
    flatpak_binary: string;
    // General:
    autostart: "no" | "boot" | "gamescope";
    keep_running_on_desktop: boolean;
    port: number;
    api_key: string;
    basic_auth_user: string;
    basic_auth_pass: string;
    is_setup: boolean | "migratingV2";
}
