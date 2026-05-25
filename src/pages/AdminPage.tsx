import { usePageState } from '../components/page/usePageState';
import { AdminPage } from '../components/page/PageUI';

export default function PageEditor() {
  const state = usePageState();
  return <PageUI {...state} />;
}