import {unstable_setRequestLocale} from 'next-intl/server';
import {redirect} from '@/navigation';
 
type Props = {
  params: Promise<{locale: string}>;
};
 
export default async function RootPage({params}: Props) {
  const {locale} = await params;
  unstable_setRequestLocale(locale);
  redirect('/dashboard');
}
