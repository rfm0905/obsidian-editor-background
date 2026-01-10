import { Plugin, WorkspaceWindow, TFile, normalizePath } from 'obsidian';
import { UrlSettingsTab } from './PluginSettingsTab';

interface PluginSettings {
	useLocalImage: boolean;
	imagePath: string;
	opacity: number;
	bluriness: string;
	inputContrast: boolean;
	position: string;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	useLocalImage: false,
	imagePath: '',
	opacity: 0.3,
	bluriness: 'low',
	inputContrast: false,
	position: 'center',
};

export default class BackgroundPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new UrlSettingsTab(this.app, this));
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
		this.UpdateBackground();
	}

	private resolveURL() {
		// https://picsum.photos/id/997/1920/1080.jpg for testing
		if (!this.settings.useLocalImage) {
			console.log(this.settings.imagePath);
			return this.settings.imagePath?.trim() || null;
		}

		const filePath = normalizePath(this.settings.imagePath?.trim() || '');
		if (!filePath) {
			// can't find file
			return null;
		}
		console.log(filePath);

		const af = this.app.vault.getAbstractFileByPath(filePath);
		if (!(af instanceof TFile)) {
			return null;
		}
		return this.app.vault.getResourcePath(af);
	}

	UpdateBackground(doc: Document = activeDocument) {
		const imageURL = this.resolveURL();

		doc.body.style.setProperty(
			'--obsidian-editor-background-image',
			`url('${imageURL}')`,
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
