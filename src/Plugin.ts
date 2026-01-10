import { Plugin, WorkspaceWindow } from 'obsidian';
import { SettingsTab } from './PluginSettingsTab';
import { resolvePath, resolveURL, URLResult } from './Validation';
import { Notice } from 'obsidian';

interface PluginSettings {
	useLocalImage: boolean; // whether to use local file (true) or remote URL
	imageLocation: string; // path to file or URL
	opacity: number;
	bluriness: string;
	inputContrast: boolean;
	position: string;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	useLocalImage: false,
	imageLocation: '',
	opacity: 0.3,
	bluriness: 'low',
	inputContrast: false,
	position: 'center',
};

export default class BackgroundPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));
		this.app.workspace.onLayoutReady(() => this.UpdateBackground(document));
		this.app.workspace.on('window-open', (win: WorkspaceWindow) =>
			this.UpdateBackground(win.doc),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		void this.UpdateBackground();
	}

	private async resolveImage(): Promise<URLResult> {
		if (!this.settings.imageLocation) {
			return { imageURL: null, error: 'Path is empty' };
		}

		if (this.settings.useLocalImage) {
			return resolvePath(this.settings.imageLocation);
		}
		return await resolveURL(this.settings.imageLocation);
	}

	// render notice if error
	private lastNoticeError: string | null = null;
	private maybeNotice(error: string | null) {
		if (error && error !== this.lastNoticeError) {
			new Notice(`Obsidian Background Image: ${error}`);
		}
		this.lastNoticeError = error;
	}

	async UpdateBackground(doc: Document = activeDocument) {
		const { imageURL: url, error } = await this.resolveImage();
		this.maybeNotice(error);
		doc.body.style.setProperty(
			'--obsidian-editor-background-image',
			`url("${url}")`,
		);
		doc.body.style.setProperty(
			'--obsidian-editor-background-opacity',
			`${this.settings.opacity}`,
		);
		doc.body.style.setProperty(
			'--obsidian-editor-background-bluriness',
			`blur(${this.settings.bluriness})`,
		);
		doc.body.style.setProperty(
			'--obsidian-editor-background-input-contrast',
			this.settings.inputContrast ? '#ffffff17' : 'none',
		);
		doc.body.style.setProperty(
			'--obsidian-editor-background-line-padding',
			this.settings.inputContrast ? '1rem' : '0',
		);
		doc.body.style.setProperty(
			'--obsidian-editor-background-position',
			this.settings.position,
		);
	}
}
