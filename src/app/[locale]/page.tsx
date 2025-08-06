import {unstable_setRequestLocale} from 'next-intl/server';
import {redirect} from '@/navigation';
 
type Props = {
  params: {locale: string};
};
 
export default function RootPage({params}: Props) {
  unstable_setRequestLocale(params.locale);
  redirect('/dashboard');
}
