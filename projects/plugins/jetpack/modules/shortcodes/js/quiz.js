( function ( $ ) {
	$.fn.shuffleQuiz = function () {
		var allElems = this.get(),
			getRandom = function ( max ) {
				return Math.floor( Math.random() * max );
			},
			shuffled = $.map( allElems, function () {
				var random = getRandom( allElems.length ),
					randEl = $( allElems[ random ] ).clone( true )[ 0 ];
				allElems.splice( random, 1 );
				return randEl;
			} );

		this.each( function ( i ) {
			$( this ).replaceWith( $( shuffled[ i ] ) );
		} );

		return $( shuffled );
	};
} )( jQuery );

jQuery( function ( $ ) {
	$( '.jetpack-quiz' ).each( function () {
		var quiz = $( this );
		quiz.find( 'div.jetpack-quiz-answer' ).shuffleQuiz();
		quiz.find( 'div[data-correct]' ).removeAttr( 'data-correct' ).data( 'correct', 1 );
		quiz.find( 'div.jetpack-quiz-answer:last' ).addClass( 'last' );
	} );

	$( 'div.jetpack-quiz' ).on( 'click', 'div.jetpack-quiz-answer', function () {
		var trackid,
			answer = $( this ),
			quiz = answer.closest( 'div.jetpack-quiz' );

		if ( quiz.data( 'a8ctraining' ) ) {
			new Image().src =
				'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_trainingchaos-' +
				quiz.data( 'username' ) +
				'=' +
				quiz.data( 'a8ctraining' ) +
				'&rand=' +
				Math.random();
			quiz.data( 'a8ctraining', false );
			quiz.data( 'trackid', false );
		}

		trackid = quiz.data( 'trackid' );
		if ( answer.data( 'correct' ) ) {
			answer.addClass( 'correct' );
			if ( trackid ) {
				new Image().src =
					'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_quiz-' + trackid + '=correct&rand=' + Math.random();
			}
		} else {
			answer.addClass( 'wrong' );
			if ( trackid ) {
				new Image().src =
					'//pixel.wp.com/b.gif?v=wpcom-no-pv&x_quiz-' + trackid + '=wrong&rand=' + Math.random();
			}
		}
		// only track the first answer
		quiz.data( 'trackid', false );
	} );
} );

let quizWrapper = document.querySelectorAll( '.jetpack-quiz-wrapper' );
for ( let i = 0; i < quizWrapper.length; i++ ) {
	quizWrapper[ i ].childNodes.forEach( ( element, number ) => {
		element.style.display = 'none';
		element.setAttribute( 'quiz-number', number );
		element.querySelector( '.jetpack-quiz-count' ).innerHTML =
			number + 1 + '/' + quizWrapper[ i ].childElementCount;
	} );

	quizWrapper[ i ].childNodes[ 0 ].style.display = 'block';
}

document.querySelectorAll( '.jetpack-quiz-option-button' ).forEach( ( element ) =>
	element.addEventListener( 'click', ( event ) => {
		let currentQuiz = element.parentElement.parentElement;
		currentQuiz.style.display = 'none';
		let switchNumber = element.getAttribute( 'data-quiz-option' ) === 'next' ? 1 : -1;
		let newQuiz =
			currentQuiz.parentElement.childNodes[
				parseInt( currentQuiz.getAttribute( 'quiz-number' ) ) + switchNumber
			];
		newQuiz.style.display = 'block';
	} )
);
