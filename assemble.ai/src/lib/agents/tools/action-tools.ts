import '@/lib/actions';
import { listActions } from '@/lib/actions/registry';
import { registerActionTools } from './action-adapter';

registerActionTools(listActions());
