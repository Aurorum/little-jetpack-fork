/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import {
	getPlanClass,
	FEATURE_UNLIMITED_PREMIUM_THEMES
} from 'lib/plans/constants';

/**
 * Internal dependencies
 */
import {
	getSitePlan,
	getAvailableFeatures,
	getActiveFeatures,
} from 'state/site';
import QuerySite from 'components/data/query-site';
import { getSiteConnectionStatus } from 'state/connection';

import PlanHeader from './plan-header';
import PlanBody from './plan-body';

export const Plans = React.createClass( {
	themesPromo() {
		const sitePlan = this.props.sitePlan.product_slug || '';
		const planClass = 'dev' !== this.props.plan
			? getPlanClass( sitePlan )
			: 'dev';

		switch ( planClass ) {
			case 'is-personal-plan':
			case 'is-premium-plan':
			case 'is-free-plan':
				return (
					<div>hello Themes</div>
				);
		}

		return null;
	},

	render() {
		let sitePlan = this.props.sitePlan.product_slug || '',
			availableFeatures = this.props.availableFeatures,
			activeFeatures = this.props.activeFeatures;
		if ( 'dev' === this.props.getSiteConnectionStatus( this.props ) ) {
			sitePlan = 'dev';
			availableFeatures = {};
			activeFeatures = {};
		}

		const premiumThemesAvailable = 'undefined' !== typeof this.props.availableFeatures[ FEATURE_UNLIMITED_PREMIUM_THEMES ],
			premiumThemesActive = 'undefined' !== typeof this.props.activeFeatures[ FEATURE_UNLIMITED_PREMIUM_THEMES ],
			showThemesPromo = premiumThemesAvailable && ! premiumThemesActive;

		return (
			<div>
				<QuerySite />
				{ showThemesPromo && this.themesPromo() }
				<div className="jp-landing__plans dops-card">
					<PlanHeader plan={ sitePlan } siteRawUrl={ this.props.siteRawUrl } />
					<PlanBody
						plan={ sitePlan }
						availableFeatures={ availableFeatures }
						activeFeatures={ activeFeatures }
						siteRawUrl={ this.props.siteRawUrl }
						siteAdminUrl={ this.props.siteAdminUrl }
					/>
				</div>
			</div>
		);
	}
} );

export default connect(
	( state ) => {
		return {
			getSiteConnectionStatus: () => getSiteConnectionStatus( state ),
			sitePlan: getSitePlan( state ),
			availableFeatures: getAvailableFeatures( state ),
			activeFeatures: getActiveFeatures( state ),
		};
	}
)( Plans );
