import {useEffect, useState, VFC} from "react";
import {
    DialogButton,
    Field,
    Focusable,
    Navigation,
    PanelSection,
    PanelSectionRow,
    Router,
    ServerAPI,
    sleep,
    SteamSpinner
} from "decky-frontend-lib";
import {FaGlobe, FaPowerOff, FaSyncAlt, FaWrench} from "react-icons/fa";
import {SyncthingState} from "./SyncthingState";
import {Settings} from "../Settings";
import {FolderPanel} from "./FolderPanel";
import {DevicesPanel} from "./DevicesPanel";
import {PLUGIN_API_GET_SETTINGS_JSON, SyncthingProcessState, WATCHDOG_PROXY_URL} from "../consts";
import {WatchdogApi} from "../api/WatchdogApi";

const MAX_TRIES = 150;

export const Context: VFC<{ serverApi: ServerAPI }> = ({serverApi}) => {
    const [state, setState] = useState<SyncthingProcessState | string>(SyncthingProcessState.Unknown);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reloadState = async (updateLoading = true) => {
        console.info(`Decky Syncthing: loading context.`);
        if (updateLoading) {
            setLoading(true);
        }
        setState(SyncthingProcessState.Unknown);
        setSettings(null);
        let watchdogApi = new WatchdogApi();
        try {
            const newState = await watchdogApi.getState();
            console.info(`Decky Syncthing: loaded state: ${newState}.`);
            setState(newState);
            const settingsResult = await serverApi.callPluginMethod<{}, string>(PLUGIN_API_GET_SETTINGS_JSON, {});
            if (settingsResult.success) {
                console.info(`Decky Syncthing: loaded settings.`);
                setSettings(JSON.parse(settingsResult.result));
                setError(null);
            } else {
                console.error(`Decky Syncthing: failed loading settings: ${settingsResult.result}`);
                setError(settingsResult.result);
            }
        } catch (err) {
            console.error(`Decky Syncthing: failed loading state: ${err}`);
            setError(`${err}`);
        }
        if (updateLoading) {
            setLoading(false);
        }
        return state;
    };

    const toggleSyncthing = async() => {
        console.error(`Decky Syncthing: toggling`);
        if (!loading) {
            setLoading(true);
            try {
                const watchdogApi = new WatchdogApi();
                switch (state) {
                    case SyncthingProcessState.Running:
                    case SyncthingProcessState.Wait:
                        console.error(`Decky Syncthing: stopping...`);
                        await watchdogApi.stop();
                        await sleep(100);
                        console.error(`Decky Syncthing: reloading state...`);
                        await reloadState(false);
                        break;
                    default:
                        console.error(`Decky Syncthing: starting...`);
                        await watchdogApi.start();
                        setState(SyncthingProcessState.Wait);
                        await sleep(100);
                        let i = 0;
                        while (!(await watchdogApi.checkIfUp())) {
                            console.error(`Decky Syncthing: still waiting...`);
                            if (i++ >= MAX_TRIES) {
                                // noinspection ExceptionCaughtLocallyJS
                                throw new Error("Timeout.");
                            }
                            await sleep(200);
                        }
                        console.error(`Decky Syncthing: reloading state...`);
                        await reloadState(false);
                        break;
                }
            } catch (err) {
                console.error(`Decky Syncthing: failed starting/stopping: ${err}`);
                setState(SyncthingProcessState.Unknown);
                setError(`${err}`);
            }
            setLoading(false);
        }
    }

    useEffect(() => {
        reloadState();
    }, [serverApi]);

    if (loading) {
        return (
            <Focusable
                style={{
                    overflowY: 'scroll',
                    backgroundColor: 'transparent',
                    marginTop: '40px',
                    height: 'calc( 100% - 40px )',
                }}
            >
                <SteamSpinner/>
            </Focusable>
        )
    }


    return (
        <>
            <PanelSection>
                <PanelSectionRow>
                    <Focusable flow-children="horizontal"
                               style={{display: "flex", padding: 0, gap: "8px"}}>
                        <DialogButton
                            style={{minWidth: 0, width: "15%", height: "32px", padding: 0}}
                            onClick={() => reloadState()}
                        >
                            <FaSyncAlt/>
                        </DialogButton>
                        <DialogButton
                            style={{minWidth: 0, width: "15%", height: "32px", padding: 0}}
                            onClick={() => {
                                Router.CloseSideMenus();
                                Router.Navigate("/decky-syncthing/settings");
                            }}
                        >
                            <FaWrench/>
                        </DialogButton>
                        <DialogButton
                            style={{minWidth: 0, width: "15%", height: "32px", padding: 0}}
                            onClick={() => {
                                Router.CloseSideMenus();
                                console.info(`Decky Syncthing: opening ${WATCHDOG_PROXY_URL}`);
                                Navigation.NavigateToExternalWeb(WATCHDOG_PROXY_URL);
                            }}
                        >
                            <FaGlobe/>
                        </DialogButton>
                        <DialogButton
                            style={{minWidth: 0, width: "15%", height: "32px", padding: 0}}
                            onClick={() => toggleSyncthing()}
                        >
                            <FaPowerOff/>
                        </DialogButton>
                    </Focusable>
                </PanelSectionRow>
                <PanelSectionRow>
                    <Field label={<SyncthingState state={state} hasError={error != null}/>}/>
                </PanelSectionRow>
            </PanelSection>
            {error != null && (
                <>
                    <PanelSection title="Error">
                        <PanelSectionRow>
                            {error}
                        </PanelSectionRow>
                    </PanelSection>
                </>
            )}
            {state == SyncthingProcessState.Running && settings != null && (
                <>
                    <PanelSection title="Folder">
                        <PanelSectionRow>
                            <FolderPanel port={settings.port} apiKey={settings.api_key}/>
                        </PanelSectionRow>
                    </PanelSection>
                    <PanelSection title="Devices">
                        <PanelSectionRow>
                            <DevicesPanel port={settings.port} apiKey={settings.api_key}/>
                        </PanelSectionRow>
                    </PanelSection>
                </>
            )}
        </>
    );
}
