import {DefaultUrlSerializer, Router, UrlTree} from '@angular/router';

const URL_SERIALIZER = new DefaultUrlSerializer();

/**
 * Whether the router is currently on its way to another page - not just to other query parameters
 * of the page shown now. A screen that mirrors its state into the URL with a navigation of its own
 * has to skip that while this is true: its navigation would supersede (and so cancel) the one the
 * user started, e.g. a search answer arriving after a click on one of the results.
 */
export function isNavigatingToAnotherPage(router: Router): boolean {
  const navigation = router.currentNavigation();
  if (!navigation) {
    return false;
  }
  const target = navigation.finalUrl ?? navigation.extractedUrl;
  return pathOf(target) !== pathOf(URL_SERIALIZER.parse(router.url));
}

/** The URL without its query parameters and fragment. */
function pathOf(tree: UrlTree): string {
  return URL_SERIALIZER.serialize(new UrlTree(tree.root));
}
