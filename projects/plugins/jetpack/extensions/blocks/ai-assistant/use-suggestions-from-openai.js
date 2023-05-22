/**
 * External dependencies
 */
import { useSelect, select as selectData } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import debugFactory from 'debug';
/**
 * Internal dependencies
 */
import { buildPrompt } from './create-prompt';
import { askJetpack, askQuestion } from './get-suggestion-with-stream';
import { DEFAULT_PROMPT_TONE } from './tone-dropdown-control';

const debug = debugFactory( 'jetpack-ai-assistant' );

/**
 * Returns partial content from the beginning of the post
 * to the current block (clientId)
 *
 * @param {string} clientId - The current block clientId.
 * @returns {string}          The partial content.
 */
export function getPartialContentToBlock( clientId ) {
	if ( ! clientId ) {
		return '';
	}

	const editor = selectData( 'core/block-editor' );
	const index = editor.getBlockIndex( clientId );
	const blocks = editor.getBlocks().slice( 0, index ) ?? [];
	if ( ! blocks?.length ) {
		return '';
	}

	return blocks
		.filter( function ( block ) {
			return block && block.attributes && block.attributes.content;
		} )
		.map( function ( block ) {
			return block.attributes.content.replaceAll( '<br/>', '\n' );
		} )
		.join( '\n' );
}

/**
 * Returns content from all blocks,
 * by inspecting the blocks `content` attributes
 *
 * @returns {string} The content.
 */
export function getContentFromBlocks() {
	const editor = selectData( 'core/block-editor' );
	const blocks = editor.getBlocks();

	if ( ! blocks?.length ) {
		return '';
	}

	return blocks
		.filter( function ( block ) {
			return block && block.attributes && block.attributes.content;
		} )
		.map( function ( block ) {
			return block.attributes.content.replaceAll( '<br/>', '\n' );
		} )
		.join( '\n' );
}

const useSuggestionsFromOpenAI = ( {
	clientId,
	content,
	setAttributes,
	setErrorMessage,
	tracks,
	userPrompt,
} ) => {
	const [ isLoadingCategories, setIsLoadingCategories ] = useState( false );
	const [ isLoadingCompletion, setIsLoadingCompletion ] = useState( false );
	const [ wasCompletionJustRequested, setWasCompletionJustRequested ] = useState( false );
	const [ showRetry, setShowRetry ] = useState( false );
	const [ lastPrompt, setLastPrompt ] = useState( '' );

	// Let's grab post data so that we can do something smart.

	const currentPostTitle = useSelect( select =>
		select( 'core/editor' ).getEditedPostAttribute( 'title' )
	);

	//TODO: decide if we still want to load categories and tags now user is providing the prompt by default.
	// If not the following can be removed.
	let loading = false;
	const categories =
		useSelect( select => select( 'core/editor' ).getEditedPostAttribute( 'categories' ) ) || [];

	const categoryObjects = useSelect(
		select => {
			return categories
				.map( categoryId => {
					const category = select( 'core' ).getEntityRecord( 'taxonomy', 'category', categoryId );

					if ( ! category ) {
						// Data is not yet loaded
						loading = true;
						return;
					}

					return category;
				} )
				.filter( Boolean ); // Remove undefined values
		},
		[ categories ]
	);

	const tags =
		useSelect( select => select( 'core/editor' ).getEditedPostAttribute( 'tags' ), [] ) || [];
	const tagObjects = useSelect(
		select => {
			return tags
				.map( tagId => {
					const tag = select( 'core' ).getEntityRecord( 'taxonomy', 'post_tag', tagId );

					if ( ! tag ) {
						// Data is not yet loaded
						loading = true;
						return;
					}

					return tag;
				} )
				.filter( Boolean ); // Remove undefined values
		},
		[ tags ]
	);

	useEffect( () => {
		setIsLoadingCategories( loading );
	}, [ loading ] );

	const postId = useSelect( select => select( 'core/editor' ).getCurrentPostId() );
	// eslint-disable-next-line no-unused-vars
	const categoryNames = categoryObjects
		.filter( cat => cat.id !== 1 )
		.map( ( { name } ) => name )
		.join( ', ' );
	// eslint-disable-next-line no-unused-vars
	const tagNames = tagObjects.map( ( { name } ) => name ).join( ', ' );

	const getStreamedSuggestionFromOpenAI = async ( type, options = {} ) => {
		options = {
			retryRequest: false,
			tone: DEFAULT_PROMPT_TONE,
			...options,
		};

		if ( isLoadingCompletion ) {
			return;
		}

		setShowRetry( false );
		setErrorMessage( false );

		let prompt = lastPrompt;

		if ( ! options.retryRequest ) {
			// If there is a content already, let's iterate over it.
			prompt = buildPrompt( {
				generatedContent: content,
				allPostContent: getContentFromBlocks(),
				postContentAbove: getPartialContentToBlock( clientId ),
				currentPostTitle,
				options,
				prompt,
				userPrompt,
				type,
			} );
		}

		tracks.recordEvent( 'jetpack_ai_chat_completion', {
			post_id: postId,
		} );

		if ( ! options.retryRequest ) {
			setLastPrompt( prompt );
			setAttributes( { promptType: type } );
		}

		let source;
		try {
			setIsLoadingCompletion( true );
			setWasCompletionJustRequested( true );
			source = await askQuestion( prompt, postId );
		} catch ( err ) {
			if ( err.message ) {
				setErrorMessage( err.message ); // Message was already translated by the backend
			} else {
				setErrorMessage(
					__(
						'Whoops, we have encountered an error. AI is like really, really hard and this is an experimental feature. Please try again later.',
						'jetpack'
					)
				);
			}
			setShowRetry( true );
			setIsLoadingCompletion( false );
			setWasCompletionJustRequested( false );
		}

		source.addEventListener( 'done', e => {
			source.close();
			setIsLoadingCompletion( false );
			setWasCompletionJustRequested( false );
			setAttributes( { content: e.detail } );
		} );
		source.addEventListener( 'error_unclear_prompt', () => {
			source.close();
			setIsLoadingCompletion( false );
			setWasCompletionJustRequested( false );
			setErrorMessage( __( 'Your request was unclear. Mind trying again?', 'jetpack' ) );
		} );
		source.addEventListener( 'suggestion', e => {
			setWasCompletionJustRequested( false );
			debug( 'fullMessage', e.detail );
			setAttributes( { content: e.detail } );
		} );
		return source;
	};

	return {
		isLoadingCategories,
		isLoadingCompletion,
		wasCompletionJustRequested,
		setIsLoadingCategories,
		setShowRetry,
		showRetry,
		postTitle: currentPostTitle,
		contentBefore: getPartialContentToBlock( clientId ),
		wholeContent: getContentFromBlocks( clientId ),

		getSuggestionFromOpenAI: getStreamedSuggestionFromOpenAI,
		retryRequest: () => getStreamedSuggestionFromOpenAI( '', { retryRequest: true } ),
	};
};

export default useSuggestionsFromOpenAI;

/**
 * askJetpack is exposed just for debugging purposes
 */
window.askJetpack = askJetpack;
