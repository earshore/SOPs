import { showToast } from '@/common/ui/notifications';
import { copyTextToClipboard } from './clipboard';
import type { OwnerFieldController } from './ownerField';

export interface TemplateCopyActionConfig {
  ownerField: OwnerFieldController;
  buildTemplate: (owner: string) => string;
  successMessage: string;
  failureMessage: string;
}

export function createTemplateCopyAction(config: TemplateCopyActionConfig): () => Promise<void> {
  return async () => {
    const owner = config.ownerField.read();
    config.ownerField.save(owner);
    const template = config.buildTemplate(owner);

    try {
      if (!(await copyTextToClipboard(template))) {
        throw new Error('clipboard unavailable');
      }

      showToast(config.successMessage, { type: 'success' });
    } catch {
      showToast(config.failureMessage, { type: 'error' });
    }
  };
}
