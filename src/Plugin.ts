import { Plugin, WorkspaceWindow } from 'obsidian';
import { SettingsTab } from './PluginSettingsTab';
import {
	resolvePath as resolveLocal,
	resolveURL as resolveRemote,
	URLResult,
} from './Validation';
import { Notice } from 'obsidian';

interface PluginSettings {
	useLocal: boolean; // whether to use local file (true) or remote URL
	imageLocation: string; // path to file or URL
	opacity: number;
	bluriness: string;
	inputContrast: boolean;
	position: string;
}

export const DEFAULT_SETTINGS: Partial<PluginSettings> = {
	useLocal: false,
	imageLocation: '',
	opacity: 0.3,
	bluriness: 'low',
	inputContrast: false,
	position: 'center',
};

export default class BackgroundPlugin extends Plugin {
	settings: PluginSettings;

	private prevBlobURL: string | null = null; // to avoid memory leaks
	private prevError: string | null = null; // to avoid rerendering same notice

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

	async onunload() {
		// clear up blob to avoid memory leaks
		if (this.prevBlobURL) {
			URL.revokeObjectURL(this.prevBlobURL);
			this.prevBlobURL = null;
		}

		const doc = document;
		doc.body.style.removeProperty('--obsidian-editor-background-image');
		doc.body.style.removeProperty('--obsidian-editor-background-opacity');
		doc.body.style.removeProperty('--obsidian-editor-background-blur');
		doc.body.style.removeProperty(
			'--obsidian-editor-background-input-contrast',
		);
		doc.body.style.removeProperty(
			'--obsidian-editor-background-line-padding',
		);
		doc.body.style.removeProperty('--obsidian-editor-background-position');
	}

	private async resolveImage(): Promise<URLResult> {
		const loc = (this.settings.imageLocation ?? '').trim();
		if (!loc) {
			return { location: null, error: 'Background location is empty' };
		}

		if (this.settings.useLocal) {
			// local image
			return await resolveLocal(loc);
		}
		return await resolveRemote(loc); // remote URL
	}

	private maybeNotice(error: string | null) {
		if (error && error !== this.prevError) {
			new Notice(`Obsidian Background Image: ${error}`);
		}
		this.prevError = error;
	}

	async UpdateBackground(doc: Document = activeDocument) {
		const { location: url, error } = await this.resolveImage();

		if (this.prevBlobURL && this.prevBlobURL !== url) {
			URL.revokeObjectURL(this.prevBlobURL);
			this.prevBlobURL = null;
		}

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
