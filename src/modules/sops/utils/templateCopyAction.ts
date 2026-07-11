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

    if (!(await copyTextToClipboard(template))) {
      showToast(config.failureMessage, { type: 'error' });
      return;
    }

    showToast(config.successMessage, { type: 'success' });
  };
}
